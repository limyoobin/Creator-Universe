import { MemberRole, Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";
import { ONE_HUNDRED, decimalToNumber, roundToTwo, toDecimal } from "../utils/decimal.js";

type ProjectMemberInput = {
  userId: string;
  memberRole: MemberRole;
  sharePercentage: number;
  settlementAccount?: string;
};

type CreateProjectInput = {
  title: string;
  slug: string;
  description?: string;
  synopsis?: string;
  coverImageUrl?: string;
  heroArtworkUrl?: string;
  priceCoins?: number;
  isOfficialPartner?: boolean;
  platformFeeRate?: number;
  partnerFeeRate?: number;
  members: ProjectMemberInput[];
};

function validateMemberShares(members: ProjectMemberInput[], ownerId: string) {
  if (members.length === 0) {
    throw new AppError("At least one project member is required.", 422);
  }

  if (!members.some((member) => member.userId === ownerId)) {
    throw new AppError("Project owner must be included in the project members list.", 422);
  }

  const seen = new Set<string>();
  const total = members.reduce((sum, member) => {
    if (member.sharePercentage <= 0) {
      throw new AppError("sharePercentage must be greater than 0.", 422);
    }

    const key = `${member.userId}:${member.memberRole}`;
    if (seen.has(key)) {
      throw new AppError("Duplicate member role assignment found in project members.", 422);
    }
    seen.add(key);

    return sum.plus(toDecimal(member.sharePercentage));
  }, new Prisma.Decimal(0));

  if (!total.equals(ONE_HUNDRED)) {
    throw new AppError("Project member share percentages must add up to exactly 100.", 422);
  }
}

function getMonthRange(baseDate?: string) {
  const anchor = baseDate ? new Date(baseDate) : new Date();
  if (Number.isNaN(anchor.getTime())) {
    throw new AppError("Invalid date format for settlement dashboard.", 422);
  }

  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);

  return { start, end };
}

export async function createProjectWithMembers(ownerId: string, input: CreateProjectInput) {
  validateMemberShares(input.members, ownerId);

  const memberIds = [...new Set(input.members.map((member) => member.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, isPartner: true },
  });

  if (users.length !== memberIds.length) {
    throw new AppError("One or more users in project members do not exist.", 404);
  }

  const owner = users.find((user) => user.id === ownerId);

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        ownerId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        synopsis: input.synopsis,
        coverImageUrl: input.coverImageUrl,
        heroArtworkUrl: input.heroArtworkUrl,
        priceCoins: input.priceCoins ?? 1000,
        isOfficialPartner: Boolean(owner?.isPartner),
        platformFeeRate: toDecimal(0.15),
        partnerFeeRate: toDecimal(0.08),
        members: {
          create: input.members.map((member) => ({
            userId: member.userId,
            memberRole: member.memberRole,
            sharePercentage: toDecimal(member.sharePercentage),
            settlementAccount: member.settlementAccount,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return project;
  });
}

export async function getProjectDetail(projectId: string, currentUserId?: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
      members: {
        where: { isActive: true },
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              creatorProfile: true,
            },
          },
        },
      },
      episodes: {
        orderBy: { sequenceNumber: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          sequenceNumber: true,
          durationSeconds: true,
          isPublished: true,
          publishedAt: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  const hasAccess = currentUserId
    ? Boolean(
        project.members.some((member) => member.userId === currentUserId) ||
          (await prisma.contentAccess.findUnique({
            where: {
              userId_projectId: {
                userId: currentUserId,
                projectId,
              },
            },
            select: { id: true },
          })),
      )
    : false;

  return {
    ...project,
    hasAccess,
  };
}

export async function getProjectSettlementDashboard(projectId: string, currentUserId: string, baseDate?: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { isActive: true },
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  const { start, end } = getMonthRange(baseDate);

  const aggregates = await prisma.transaction.aggregate({
    where: {
      projectId,
      status: TransactionStatus.PAID,
      purchasedAt: {
        gte: start,
        lt: end,
      },
    },
    _sum: {
      grossAmount: true,
      platformFeeAmount: true,
      netAmount: true,
    },
  });

  const gross = aggregates._sum.grossAmount ?? toDecimal(0);
  const fee = aggregates._sum.platformFeeAmount ?? toDecimal(0);
  const net = aggregates._sum.netAmount ?? toDecimal(0);

  const myMembership = project.members.find((member) => member.userId === currentUserId);
  const mySettlement = myMembership ? roundToTwo(net.mul(myMembership.sharePercentage).div(ONE_HUNDRED)) : toDecimal(0);

  return {
    projectId: project.id,
    title: project.title,
    month: start.toISOString().slice(0, 7),
    grossAmount: decimalToNumber(gross),
    platformFeeAmount: decimalToNumber(fee),
    netAmount: decimalToNumber(net),
    appliedFeeRate: decimalToNumber(project.isOfficialPartner ? project.partnerFeeRate : project.platformFeeRate),
    members: project.members.map((member) => ({
      userId: member.userId,
      displayName: member.user.displayName,
      username: member.user.username,
      memberRole: member.memberRole,
      sharePercentage: decimalToNumber(member.sharePercentage),
      expectedSettlement: decimalToNumber(roundToTwo(net.mul(member.sharePercentage).div(ONE_HUNDRED))),
    })),
    mySettlement: {
      userId: currentUserId,
      sharePercentage: myMembership ? decimalToNumber(myMembership.sharePercentage) : 0,
      amount: decimalToNumber(mySettlement),
    },
  };
}
