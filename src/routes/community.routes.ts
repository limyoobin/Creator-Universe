import { MatchRequestStatus, MemberRole, Prisma, ProjectStatus, TransactionStatus, TransactionType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { roundToTwo, toDecimal } from "../utils/decimal.js";
import { getCurrentUserId } from "../utils/request-context.js";

const communityRouter = Router();

const matchRequestUserSelect = {
  id: true,
  displayName: true,
  username: true,
  creatorProfile: { select: { primaryRole: true } },
} satisfies Prisma.UserSelect;

const matchRequestInclude = {
  requester: { select: matchRequestUserSelect },
  targetUser: { select: matchRequestUserSelect },
} satisfies Prisma.MatchRequestInclude;

type MatchRequestWithUsers = Prisma.MatchRequestGetPayload<{
  include: typeof matchRequestInclude;
}>;

const reviews: unknown[] = [];
const tickets: unknown[] = [];
const reports: unknown[] = [];

const CREATOR_COMMERCE_PROJECT_ID = "system-creator-fanclub";

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
  creatorUserId: z.string().optional(),
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

function buildMatchInboxItem(matchRequest: MatchRequestWithUsers, viewerId: string) {
  const direction = matchRequest.requesterId === viewerId ? "sent" : "received";
  const partner = direction === "sent" ? matchRequest.targetUser : matchRequest.requester;

  return {
    id: matchRequest.id,
    direction,
    partnerUserId: partner.id,
    partnerName: partner.displayName,
    partnerUsername: partner.username,
    partnerRole: partner.creatorProfile?.primaryRole ?? matchRequest.memberRole,
    proposal: buildMatchProposal(matchRequest),
    createdAt: matchRequest.createdAt.toISOString(),
    acceptedAt: matchRequest.acceptedAt?.toISOString() ?? null,
  };
}

async function ensureCreatorCommerceProject(ownerId: string, tx: Prisma.TransactionClient) {
  const existingProject = await tx.project.findUnique({
    where: { id: CREATOR_COMMERCE_PROJECT_ID },
    select: { id: true },
  });
  if (existingProject) {
    return existingProject.id;
  }

  const project = await tx.project.create({
    data: {
      id: CREATOR_COMMERCE_PROJECT_ID,
      ownerId,
      title: "Creator Universe Fan Commerce",
      slug: "system-creator-fanclub",
      description: "Creator fan donations, subscriptions, and paid post unlock ledger.",
      status: ProjectStatus.PUBLISHED,
      isOfficialPartner: true,
      priceCoins: 0,
      platformFeeRate: 0,
      partnerFeeRate: 0,
      settlementCurrency: "COIN",
    },
    select: { id: true },
  });

  return project.id;
}

function getCreatorFeeRate(isPartner: boolean) {
  return isPartner ? toDecimal(0.08) : toDecimal(0.15);
}

async function createCreatorCommerceTransaction(input: {
  payerId: string;
  creatorUserId: string;
  amountCoins: number;
  transactionType: TransactionType;
  tx: Prisma.TransactionClient;
}) {
  if (input.amountCoins <= 0) {
    return {
      transaction: await input.tx.transaction.create({
        data: {
          buyerId: input.payerId,
          projectId: await ensureCreatorCommerceProject(input.payerId, input.tx),
          transactionType: input.transactionType,
          status: TransactionStatus.PAID,
          currency: "COIN",
          grossAmount: 0,
          appliedFeeRate: 0,
          platformFeeAmount: 0,
          netAmount: 0,
          coinAmount: 0,
          purchasedAt: new Date(),
        },
      }),
      platformFeeRate: toDecimal(0),
      platformFeeAmount: toDecimal(0),
      creatorAmount: toDecimal(0),
    };
  }

  const [payerWallet, creator] = await Promise.all([
    input.tx.wallet.findUnique({ where: { userId: input.payerId }, select: { balance: true } }),
    input.tx.user.findUnique({ where: { id: input.creatorUserId }, select: { id: true, isPartner: true } }),
  ]);

  if (!creator) {
    throw new AppError("Creator not found.", 404);
  }

  const grossAmount = toDecimal(input.amountCoins);
  if (!payerWallet || payerWallet.balance.lt(grossAmount)) {
    throw new AppError("보유 코인이 부족합니다. 코인을 충전해 주세요.", 402);
  }

  const projectId = await ensureCreatorCommerceProject(input.payerId, input.tx);
  const platformFeeRate = getCreatorFeeRate(creator.isPartner);
  const platformFeeAmount = roundToTwo(grossAmount.mul(platformFeeRate));
  const creatorAmount = grossAmount.minus(platformFeeAmount);

  const transaction = await input.tx.transaction.create({
    data: {
      buyerId: input.payerId,
      projectId,
      transactionType: input.transactionType,
      status: TransactionStatus.PAID,
      currency: "COIN",
      grossAmount,
      appliedFeeRate: platformFeeRate,
      platformFeeAmount,
      netAmount: creatorAmount,
      coinAmount: input.amountCoins,
      purchasedAt: new Date(),
    },
  });

  await input.tx.wallet.update({
    where: { userId: input.payerId },
    data: { balance: { decrement: grossAmount } },
  });
  await input.tx.wallet.upsert({
    where: { userId: input.creatorUserId },
    create: {
      userId: input.creatorUserId,
      balance: creatorAmount,
      currency: "COIN",
    },
    update: {
      balance: { increment: creatorAmount },
    },
  });

  return { transaction, platformFeeRate, platformFeeAmount, creatorAmount };
}

async function buildChatThreads(viewerId: string) {
  const relevantMessages = await prisma.chatMessage.findMany({
    where: {
      OR: [{ senderId: viewerId }, { receiverUserId: viewerId }],
    },
    include: {
      matchRequest: { include: matchRequestInclude },
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
    const creatorUserId = String(req.params.creatorUserId);
    const payload = donationSchema.parse(req.body);
    const donation = await prisma.$transaction(async (tx) => {
      const commerce = await createCreatorCommerceTransaction({
        payerId: supporterId,
        creatorUserId,
        amountCoins: payload.amount,
        transactionType: TransactionType.DONATION,
        tx,
      });

      return tx.creatorDonation.create({
        data: {
          supporterId,
          creatorUserId,
          transactionId: commerce.transaction.id,
          amountCoins: payload.amount,
          message: payload.message,
          platformFeeRate: commerce.platformFeeRate,
          platformFeeAmount: commerce.platformFeeAmount,
          creatorAmount: commerce.creatorAmount,
        },
      });
    });
    res.status(201).json({ success: true, data: donation });
  }),
);

communityRouter.post(
  "/creators/:creatorUserId/subscriptions",
  asyncHandler(async (req, res) => {
    const subscriberId = await getCurrentUserId(req);
    const creatorUserId = String(req.params.creatorUserId);
    const payload = subscriptionSchema.parse(req.body);
    const nextBillingAt = new Date();
    nextBillingAt.setMonth(nextBillingAt.getMonth() + 1);

    const subscription = await prisma.$transaction(async (tx) => {
      const commerce = await createCreatorCommerceTransaction({
        payerId: subscriberId,
        creatorUserId,
        amountCoins: payload.priceCoins,
        transactionType: TransactionType.SUBSCRIPTION,
        tx,
      });

      return tx.creatorSubscription.create({
        data: {
          subscriberId,
          creatorUserId,
          transactionId: commerce.transaction.id,
          tierName: payload.tierName,
          priceCoins: payload.priceCoins,
          status: "ACTIVE",
          nextBillingAt,
        },
      });
    });
    res.status(201).json({ success: true, data: subscription });
  }),
);

communityRouter.post(
  "/fan-posts/:postId/unlock",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = unlockSchema.parse(req.body);
    const postId = String(req.params.postId);
    const unlock = await prisma.$transaction(async (tx) => {
      const existingUnlock = await tx.fanPostUnlock.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      if (existingUnlock) {
        return existingUnlock;
      }

      const commerce = await createCreatorCommerceTransaction({
        payerId: userId,
        creatorUserId: payload.creatorUserId ?? userId,
        amountCoins: payload.priceCoins,
        transactionType: TransactionType.CONTENT_PURCHASE,
        tx,
      });

      return tx.fanPostUnlock.create({
        data: {
          userId,
          creatorUserId: payload.creatorUserId,
          postId,
          transactionId: commerce.transaction.id,
          priceCoins: payload.priceCoins,
        },
      });
    });
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

communityRouter.get(
  "/matching/requests",
  asyncHandler(async (req, res) => {
    const viewerId = await getCurrentUserId(req);
    const requests = await prisma.matchRequest.findMany({
      where: {
        OR: [{ requesterId: viewerId }, { targetUserId: viewerId }],
      },
      include: matchRequestInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: requests.map((request) => buildMatchInboxItem(request, viewerId)) });
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
      include: matchRequestInclude,
    });
    const chatMessage = await prisma.chatMessage.create({
      data: {
        senderId: requesterId,
        receiverUserId: payload.targetUserId,
        body: `${requester?.displayName ?? "창작자"}님이 '${matchRequest.projectTitle}' 프로젝트에 ${payload.sharePercentage}% 수익 지분 조건으로 매칭을 제안했습니다.`,
        matchRequestId: matchRequest.id,
      },
    });
    const updatedChatMessage = await prisma.chatMessage.update({
      where: { id: chatMessage.id },
      data: {
        body: `${requester?.displayName ?? "창작자"}님이 '${matchRequest.projectTitle}' 프로젝트에 ${payload.sharePercentage}% 수익 지분 조건으로 매칭을 제안했습니다.`,
      },
    });
    res.status(201).json({ success: true, data: { matchRequest, chatMessage: updatedChatMessage } });
  }),
);

communityRouter.post(
  "/matching/requests/:requestId/accept",
  asyncHandler(async (req, res) => {
    const receiverId = await getCurrentUserId(req);
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: String(req.params.requestId) },
      include: matchRequestInclude,
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
      include: matchRequestInclude,
    });
    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { displayName: true } });
    const acceptanceMessage = await prisma.chatMessage.create({
      data: {
        senderId: receiverId,
        receiverUserId: matchRequest.requesterId,
        body: `${receiver?.displayName ?? "초대받은 창작자"}님이 ${Number(matchRequest.sharePercentage)}% 수익 지분 제안을 수락했고 팀 정산 멤버에 합류했습니다.`,
      },
    });
    await prisma.chatMessage.update({
      where: { id: acceptanceMessage.id },
      data: {
        body: `${receiver?.displayName ?? "초대받은 창작자"}님이 ${Number(matchRequest.sharePercentage)}% 수익 지분 제안을 수락했고 팀 정산 멤버에 합류했습니다.`,
      },
    });
    await prisma.chatMessage.update({
      where: { id: acceptanceMessage.id },
      data: {
        body: `${receiver?.displayName ?? "\uCD08\uB300\uBC1B\uC740 \uCC3D\uC791\uC790"}\uB2D8\uC774 ${Number(matchRequest.sharePercentage)}% \uC218\uC775 \uC9C0\uBD84 \uC81C\uC548\uC744 \uC218\uB77D\uD588\uACE0 \uD300 \uC815\uC0B0 \uBA64\uBC84\uC5D0 \uD569\uB958\uD588\uC2B5\uB2C8\uB2E4.`,
      },
    });
    res.json({ success: true, data: { matchRequest: acceptedRequest, members } });
  }),
);

communityRouter.post(
  "/matching/requests/:requestId/decline",
  asyncHandler(async (req, res) => {
    const receiverId = await getCurrentUserId(req);
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: String(req.params.requestId) },
      include: matchRequestInclude,
    });
    if (!matchRequest) {
      res.status(404).json({ success: false, message: "Matching request not found." });
      return;
    }
    if (matchRequest.targetUserId !== receiverId) {
      res.status(403).json({ success: false, message: "Only the invited creator can decline this matching request." });
      return;
    }
    if (matchRequest.status !== MatchRequestStatus.PENDING) {
      res.json({ success: true, data: { matchRequest } });
      return;
    }

    const declinedRequest = await prisma.matchRequest.update({
      where: { id: matchRequest.id },
      data: { status: MatchRequestStatus.DECLINED },
      include: matchRequestInclude,
    });
    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { displayName: true } });
    await prisma.chatMessage.create({
      data: {
        senderId: receiverId,
        receiverUserId: matchRequest.requesterId,
        body: `${receiver?.displayName ?? "초대받은 창작자"}님이 ${Number(matchRequest.sharePercentage)}% 수익 지분 매칭 제안을 거절했습니다.`,
        matchRequestId: matchRequest.id,
      },
    });

    res.json({ success: true, data: { matchRequest: declinedRequest } });
  }),
);

export { communityRouter };
