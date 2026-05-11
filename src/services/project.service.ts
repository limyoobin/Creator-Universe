import { MemberRole, Prisma, ProjectStatus, TransactionStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";
import { ONE_HUNDRED, decimalToNumber, roundToTwo, toDecimal } from "../utils/decimal.js";

const DEFAULT_PROJECT_ID = "project-midnight-signal";

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

const memberRoleLabels: Record<MemberRole, string> = {
  WRITER: "작가",
  ILLUSTRATOR: "일러스트",
  VOICE_ACTOR: "성우",
  SOUND_DIRECTOR: "BGM",
  PRODUCER: "프로듀서",
  EDITOR: "에디터",
};

function isUnsafeMemberLabel(value?: string | null) {
  if (!value) {
    return true;
  }

  const normalized = value.trim();

  return (
    normalized.length === 0 ||
    normalized.includes("�") ||
    /\?{2,}/.test(normalized) ||
    /^deleted[_\s-]/i.test(normalized) ||
    /^Deleted user/i.test(normalized)
  );
}

function getSafeMemberLabel(value: string | null | undefined, memberRole: MemberRole, index: number) {
  if (isUnsafeMemberLabel(value)) {
    return `${memberRoleLabels[memberRole] ?? "팀원"} 팀원 ${index + 1}`;
  }

  return value!.trim();
}

function getSafeMemberUsername(value: string | null | undefined, index: number) {
  if (isUnsafeMemberLabel(value)) {
    return `member-${index + 1}`;
  }

  return value!.trim();
}

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

async function ensureDefaultProject(ownerId?: string) {
  if (ownerId) {
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });

    if (owner) {
      return createDefaultProjectIfNeeded(owner.id);
    }
  }

  const fallbackOwner =
    (await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })) ??
    (await prisma.user.create({
      data: {
        id: "system-demo-owner",
        email: "system@creator-universe.local",
        username: "creator_universe_system",
        displayName: "Creator Universe",
        role: UserRole.CREATOR,
        isPartner: true,
      },
      select: { id: true },
    }));

  return createDefaultProjectIfNeeded(fallbackOwner.id);
}

async function createDefaultProjectIfNeeded(ownerId: string) {
  const project = await prisma.project.upsert({
    where: { id: DEFAULT_PROJECT_ID },
    create: {
      id: DEFAULT_PROJECT_ID,
      ownerId,
      title: "너의 이름을 부르는 목소리",
      slug: "midnight-signal",
      description: "크리에이터 유니버스 데모 콘텐츠",
      synopsis: "작가, 일러스트레이터, 성우가 함께 만든 협업형 콘텐츠입니다.",
      status: ProjectStatus.PUBLISHED,
      isOfficialPartner: false,
      priceCoins: 1000,
      platformFeeRate: toDecimal(0.15),
      partnerFeeRate: toDecimal(0.08),
      settlementCurrency: "COIN",
    },
    update: {},
    select: { id: true },
  });

  const activeMemberCount = await prisma.projectMember.count({
    where: { projectId: project.id, isActive: true },
  });

  if (activeMemberCount === 0) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId_memberRole: {
          projectId: project.id,
          userId: ownerId,
          memberRole: MemberRole.WRITER,
        },
      },
      create: {
        projectId: project.id,
        userId: ownerId,
        memberRole: MemberRole.WRITER,
        sharePercentage: toDecimal(100),
      },
      update: {
        isActive: true,
        sharePercentage: toDecimal(100),
      },
    });
  }

  return project;
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
  if (projectId === DEFAULT_PROJECT_ID) {
    await ensureDefaultProject(currentUserId);
  }

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
  if (projectId === DEFAULT_PROJECT_ID) {
    await ensureDefaultProject(currentUserId);
  }

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
    members: project.members.map((member, index) => ({
      userId: member.userId,
      displayName: getSafeMemberLabel(member.user.displayName, member.memberRole, index),
      username: getSafeMemberUsername(member.user.username, index),
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
