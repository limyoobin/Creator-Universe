import { MatchRequestStatus, MemberRole, Prisma, ProjectStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";

const communityRouter = Router();

type MatchRequestWithUsers = Prisma.MatchRequestGetPayload<{
  include: {
    requester: { select: { displayName: true } };
    targetUser: { select: { displayName: true } };
  };
}>;

const donations: unknown[] = [];
const subscriptions: unknown[] = [];
const unlocks: unknown[] = [];
const reviews: unknown[] = [];
const tickets: unknown[] = [];
const reports: unknown[] = [];

const donationSchema = z.object({
  amount: z.number().int().min(100).max(100000),
  message: z.string().optional(),
});

const subscriptionSchema = z.object({
  tierName: z.string().min(1),
  priceCoins: z.number().int().positive(),
});

const unlockSchema = z.object({
  priceCoins: z.number().int().min(0),
});

const reviewSchema = z.object({
  workId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(2),
});

const ticketSchema = z.object({
  category: z.string().min(1),
  body: z.string().min(3),
});

const reportSchema = z.object({
  targetUserId: z.string().optional(),
  reason: z.string().min(3),
  context: z.string().optional(),
});

const chatMessageSchema = z.object({
  receiverUserId: z.string().min(1),
  body: z.string().min(2),
});

const matchRequestSchema = z.object({
  targetUserId: z.string().min(1),
  projectId: z.string().min(1).default("project-midnight-signal"),
  projectTitle: z.string().optional(),
  projectType: z.string().optional(),
  memberRole: z.nativeEnum(MemberRole).default(MemberRole.PRODUCER),
  sharePercentage: z.number().min(5).max(60).default(20),
  message: z.string().optional(),
});

function buildMatchProposal(matchRequest?: MatchRequestWithUsers | null) {
  if (!matchRequest) {
    return null;
  }

  return {
    id: matchRequest.id,
    projectTitle: matchRequest.projectTitle,
    projectType: matchRequest.projectType,
    memberRole: matchRequest.memberRole,
    sharePercentage: Number(matchRequest.sharePercentage),
    message: matchRequest.message,
    status: matchRequest.status,
    requesterName: matchRequest.requester.displayName,
    targetName: matchRequest.targetUser.displayName,
  };
}

async function buildChatThreads(viewerId: string) {
  const relevantMessages = await prisma.chatMessage.findMany({
    where: {
      OR: [{ senderId: viewerId }, { receiverUserId: viewerId }],
    },
    include: {
      matchRequest: {
        include: {
          requester: { select: { displayName: true } },
          targetUser: { select: { displayName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const otherUserIds = [
    ...new Set(relevantMessages.map((message) => (message.senderId === viewerId ? message.receiverUserId : message.senderId))),
  ];
  const users = await prisma.user.findMany({
    where: { id: { in: otherUserIds } },
    include: { creatorProfile: true },
  });
  const userMap = new Map(users.map((user) => [user.id, user]));
  const threadMap = new Map<string, { otherUser: unknown; messages: unknown[] }>();

  for (const message of relevantMessages) {
    const otherUserId = message.senderId === viewerId ? message.receiverUserId : message.senderId;
    const otherUser = userMap.get(otherUserId);
    if (!otherUser) {
      continue;
    }
    if (!threadMap.has(otherUserId)) {
      threadMap.set(otherUserId, {
        otherUser: {
          id: otherUser.id,
          username: otherUser.username,
          displayName: otherUser.displayName,
          userType: otherUser.role,
          primaryRole: otherUser.creatorProfile?.primaryRole ?? null,
          responseRate: otherUser.creatorProfile?.responseRate ?? null,
          headline: otherUser.creatorProfile?.headline ?? "",
        },
        messages: [],
      });
    }

    threadMap.get(otherUserId)?.messages.push({
      id: message.id,
      senderId: message.senderId,
      receiverUserId: message.receiverUserId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      from: message.senderId === viewerId ? "me" : "creator",
      matchRequestId: message.matchRequestId ?? undefined,
      matchProposal: buildMatchProposal(message.matchRequest),
    });
  }

  return Array.from(threadMap.values()).sort((left, right) => {
    const leftMessages = left.messages as Array<{ createdAt: string }>;
    const rightMessages = right.messages as Array<{ createdAt: string }>;
    return new Date(rightMessages.at(-1)?.createdAt ?? "").getTime() - new Date(leftMessages.at(-1)?.createdAt ?? "").getTime();
  });
}

async function ensureMatchingProject(projectId: string, ownerId: string, projectTitle?: string) {
  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (existingProject) {
    return;
  }

  await prisma.project.create({
    data: {
      id: projectId,
      ownerId,
      title: projectTitle || "크리에이터 유니버스 협업 프로젝트",
      slug: projectId === "project-midnight-signal" ? "midnight-signal" : `collaboration-${Date.now()}`,
      description: "매칭 제안으로 생성된 협업 프로젝트입니다.",
      synopsis: "팀원이 제안을 수락하면 정산 멤버와 지분율에 자동 반영됩니다.",
      status: ProjectStatus.IN_PRODUCTION,
      priceCoins: 1000,
      platformFeeRate: new Prisma.Decimal(0.15),
      partnerFeeRate: new Prisma.Decimal(0.08),
      settlementCurrency: "COIN",
      members: {
        create: {
          userId: ownerId,
          memberRole: MemberRole.WRITER,
          sharePercentage: new Prisma.Decimal(100),
        },
      },
    },
  });
}

async function rebalanceProjectMembers(projectId: string, targetUserId: string, memberRole: MemberRole, proposedShare: number) {
  return prisma.$transaction(async (tx) => {
    const targetUser = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, displayName: true, username: true },
    });
    if (!targetUser) {
      throw new Error("Invited creator not found.");
    }

    const activeMembers = await tx.projectMember.findMany({
      where: { projectId, isActive: true },
      include: { user: { select: { id: true, displayName: true, username: true } } },
      orderBy: { joinedAt: "asc" },
    });
    const others = activeMembers.filter((member) => member.userId !== targetUserId);
    const remainingShare = 100 - proposedShare;
    const currentTotal = others.reduce((sum, member) => sum + Number(member.sharePercentage), 0) || 100;
    let allocated = 0;

    await Promise.all(
      others.map((member, index) => {
        const nextShare =
          index === others.length - 1
            ? Number((remainingShare - allocated).toFixed(2))
            : Number(((Number(member.sharePercentage) / currentTotal) * remainingShare).toFixed(2));
        allocated += nextShare;
        return tx.projectMember.update({
          where: { id: member.id },
          data: { sharePercentage: new Prisma.Decimal(nextShare) },
        });
      }),
    );

    const existingTargetMember = activeMembers.find((member) => member.userId === targetUserId);
    if (existingTargetMember) {
      await tx.projectMember.update({
        where: { id: existingTargetMember.id },
        data: { memberRole, sharePercentage: new Prisma.Decimal(proposedShare), isActive: true },
      });
    } else {
      await tx.projectMember.create({
        data: {
          projectId,
          userId: targetUserId,
          memberRole,
          sharePercentage: new Prisma.Decimal(proposedShare),
        },
      });
    }

    const nextMembers = await tx.projectMember.findMany({
      where: { projectId, isActive: true },
      include: { user: { select: { id: true, displayName: true, username: true } } },
      orderBy: { joinedAt: "asc" },
    });

    return nextMembers.map((member) => ({
      userId: member.userId,
      displayName: member.user.displayName,
      username: member.user.username,
      memberRole: member.memberRole,
      sharePercentage: Number(member.sharePercentage),
    }));
  });
}

communityRouter.post(
  "/creators/:creatorUserId/donations",
  asyncHandler(async (req, res) => {
    const supporterId = await getCurrentUserId(req);
    const payload = donationSchema.parse(req.body);
    const donation = {
      id: `donation-${Date.now()}`,
      supporterId,
      creatorUserId: String(req.params.creatorUserId),
      ...payload,
      createdAt: new Date().toISOString(),
    };
    donations.push(donation);
    res.status(201).json({ success: true, data: donation });
  }),
);

communityRouter.post(
  "/creators/:creatorUserId/subscriptions",
  asyncHandler(async (req, res) => {
    const subscriberId = await getCurrentUserId(req);
    const payload = subscriptionSchema.parse(req.body);
    const subscription = {
      id: `sub-${Date.now()}`,
      subscriberId,
      creatorUserId: String(req.params.creatorUserId),
      status: "ACTIVE",
      ...payload,
      startedAt: new Date().toISOString(),
    };
    subscriptions.push(subscription);
    res.status(201).json({ success: true, data: subscription });
  }),
);

communityRouter.post(
  "/fan-posts/:postId/unlock",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = unlockSchema.parse(req.body);
    const unlock = {
      id: `unlock-${Date.now()}`,
      userId,
      postId: String(req.params.postId),
      ...payload,
      unlockedAt: new Date().toISOString(),
    };
    unlocks.push(unlock);
    res.status(201).json({ success: true, data: unlock });
  }),
);

communityRouter.get(
  "/content/reviews",
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: reviews });
  }),
);

communityRouter.post(
  "/content/reviews",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = reviewSchema.parse(req.body);
    const review = {
      id: `review-${Date.now()}`,
      userId,
      authorName: "로그인 사용자",
      ...payload,
      createdAt: new Date().toISOString(),
    };
    reviews.unshift(review);
    res.status(201).json({ success: true, data: review });
  }),
);

communityRouter.post(
  "/support/tickets",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = ticketSchema.parse(req.body);
    const ticket = {
      id: `ticket-${Date.now()}`,
      userId,
      status: "OPEN",
      ...payload,
      createdAt: new Date().toISOString(),
    };
    tickets.push(ticket);
    res.status(201).json({ success: true, data: ticket });
  }),
);

communityRouter.post(
  "/reports",
  asyncHandler(async (req, res) => {
    const reporterId = await getCurrentUserId(req);
    const payload = reportSchema.parse(req.body);
    const report = {
      id: `report-${Date.now()}`,
      reporterId,
      status: "RECEIVED",
      ...payload,
      createdAt: new Date().toISOString(),
    };
    reports.push(report);
    res.status(201).json({ success: true, data: report });
  }),
);

communityRouter.post(
  "/chats/messages",
  asyncHandler(async (req, res) => {
    const senderId = await getCurrentUserId(req);
    const payload = chatMessageSchema.parse(req.body);
    const message = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverUserId: payload.receiverUserId,
        body: payload.body,
      },
    });
    res.status(201).json({ success: true, data: { message, thread: (await buildChatThreads(senderId)).find((thread) => (thread as { otherUser: { id: string } }).otherUser.id === payload.receiverUserId) ?? null } });
  }),
);

communityRouter.get(
  "/chats/threads",
  asyncHandler(async (req, res) => {
    const viewerId = await getCurrentUserId(req);
    res.json({ success: true, data: await buildChatThreads(viewerId) });
  }),
);

communityRouter.post(
  "/matching/requests",
  asyncHandler(async (req, res) => {
    const requesterId = await getCurrentUserId(req);
    const payload = matchRequestSchema.parse(req.body);
    const [requester, targetUser, project] = await Promise.all([
      prisma.user.findUnique({ where: { id: requesterId }, select: { displayName: true } }),
      prisma.user.findUnique({ where: { id: payload.targetUserId }, select: { id: true, displayName: true } }),
      prisma.project.findUnique({ where: { id: payload.projectId }, select: { title: true } }),
    ]);
    if (!targetUser) {
      res.status(404).json({ success: false, message: "Matching target not found." });
      return;
    }
    const projectTitle = payload.projectTitle || project?.title || "크리에이터 유니버스 협업 프로젝트";
    await ensureMatchingProject(payload.projectId, requesterId, projectTitle);

    const matchRequest = await prisma.matchRequest.create({
      data: {
        requesterId,
        targetUserId: payload.targetUserId,
        projectId: payload.projectId,
        projectTitle,
        projectType: payload.projectType || "멀티 콘텐츠 협업",
        memberRole: payload.memberRole,
        sharePercentage: new Prisma.Decimal(payload.sharePercentage),
        message: payload.message || `${payload.sharePercentage}% 수익 지분 조건으로 협업을 제안합니다.`,
        status: MatchRequestStatus.PENDING,
      },
      include: {
        requester: { select: { displayName: true } },
        targetUser: { select: { displayName: true } },
      },
    });
    const chatMessage = await prisma.chatMessage.create({
      data: {
        senderId: requesterId,
        receiverUserId: payload.targetUserId,
        body: `${requester?.displayName ?? "창작자"}님이 '${matchRequest.projectTitle}' 프로젝트에 ${payload.sharePercentage}% 수익 지분 조건으로 매칭을 제안했습니다.`,
        matchRequestId: matchRequest.id,
      },
    });
    res.status(201).json({ success: true, data: { ...matchRequest, chatMessage } });
  }),
);

communityRouter.post(
  "/matching/requests/:requestId/accept",
  asyncHandler(async (req, res) => {
    const receiverId = await getCurrentUserId(req);
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: String(req.params.requestId) },
      include: {
        requester: { select: { displayName: true } },
        targetUser: { select: { displayName: true } },
      },
    });
    if (!matchRequest) {
      res.status(404).json({ success: false, message: "Matching request not found." });
      return;
    }
    if (matchRequest.targetUserId !== receiverId) {
      res.status(403).json({ success: false, message: "Only the invited creator can accept this matching request." });
      return;
    }
    if (matchRequest.status === MatchRequestStatus.ACCEPTED) {
      const members = await rebalanceProjectMembers(
        matchRequest.projectId,
        matchRequest.targetUserId,
        matchRequest.memberRole,
        Number(matchRequest.sharePercentage),
      );
      res.json({ success: true, data: { matchRequest, members } });
      return;
    }

    const members = await rebalanceProjectMembers(
      matchRequest.projectId,
      matchRequest.targetUserId,
      matchRequest.memberRole,
      Number(matchRequest.sharePercentage),
    );
    const acceptedRequest = await prisma.matchRequest.update({
      where: { id: matchRequest.id },
      data: {
        status: MatchRequestStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        requester: { select: { displayName: true } },
        targetUser: { select: { displayName: true } },
      },
    });
    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { displayName: true } });
    await prisma.chatMessage.create({
      data: {
        senderId: receiverId,
        receiverUserId: matchRequest.requesterId,
        body: `${receiver?.displayName ?? "초대받은 창작자"}님이 ${Number(matchRequest.sharePercentage)}% 수익 지분 제안을 수락했고 팀 정산 멤버에 합류했습니다.`,
      },
    });
    res.json({ success: true, data: { matchRequest: acceptedRequest, members } });
  }),
);

export { communityRouter };
