import { AccessGrantType, MemberRole, Prisma, ProjectStatus, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";
import { getPlatformFeeRate } from "../constants/fees.js";
import { ONE_HUNDRED, decimalToNumber, roundToTwo, toDecimal } from "../utils/decimal.js";

type SettleContentPurchaseInput = {
  buyerId: string;
  projectId?: string;
  workId?: string;
  coinAmount: number;
};

type MemberSettlement = {
  userId: string;
  memberRole: MemberRole;
  sharePercentage: Prisma.Decimal;
  settledAmount: Prisma.Decimal;
};

// Only release a storefront SKU when its project and beneficiaries have been provisioned.
const catalogProjects = new Map([["midnight-signal", "project-midnight-signal"]]);
// The first episode is a free preview. Seed data has only a placeholder recording.
const releasedPaidEpisode = {
  isPublished: true,
  sequenceNumber: { gt: 1 },
  audioUrl: { not: "" },
  NOT: { audioUrl: { startsWith: "https://cdn.example.com/" } },
} satisfies Prisma.ProjectEpisodeWhereInput;

export async function saleCatalog() {
  const projects = await prisma.project.findMany({
    where: {
      id: { in: Array.from(catalogProjects.values()) }, status: ProjectStatus.PUBLISHED, storefrontSalesEnabled: true, priceCoins: { gt: 0 },
      members: { some: { isActive: true } }, episodes: { some: releasedPaidEpisode },
    },
    select: { id: true, priceCoins: true },
  });
  return { works: Array.from(catalogProjects).flatMap(([workId, id]) => {
    const project = projects.find(item => item.id === id);
    return project ? [{ workId, priceCoins: project.priceCoins }] : [];
  }) };
}

export async function purchasedLibrary(userId: string) {
  const access = await prisma.contentAccess.findMany({ where: { userId }, select: { projectId: true } });
  const ids = new Set(access.map(row => row.projectId));
  return { workIds: Array.from(catalogProjects).filter(([, id]) => ids.has(id)).map(([workId]) => workId) };
}

export async function purchasedAudio(userId: string, workId: string) {
  const projectId = catalogProjects.get(workId);
  if (!projectId) throw new AppError("작품을 찾을 수 없습니다.", 404);
  const access = await prisma.contentAccess.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { project: { select: { episodes: {
      where: releasedPaidEpisode,
      orderBy: { sequenceNumber: "asc" },
      select: {
        id: true, title: true, sequenceNumber: true, audioUrl: true,
        transcriptCues: { orderBy: { startMs: "asc" }, select: { text: true, startMs: true, endMs: true } },
      },
    } } } },
  });
  if (!access) throw new AppError("구매한 회원만 유료 회차를 재생할 수 있습니다.", 403);
  return access.project;
}

function ensureValidCoinAmount(coinAmount: number) {
  if (!Number.isInteger(coinAmount) || coinAmount <= 0) {
    throw new AppError("coinAmount must be a positive integer.", 422);
  }
}

function calculateMemberSettlements(
  netAmount: Prisma.Decimal,
  members: Array<{
    userId: string;
    memberRole: MemberRole;
    sharePercentage: Prisma.Decimal;
  }>,
): MemberSettlement[] {
  let allocated = new Prisma.Decimal(0);

  return members.map((member, index) => {
    const isLast = index === members.length - 1;
    const shareRatio = member.sharePercentage.div(ONE_HUNDRED);
    const settledAmount = isLast ? netAmount.minus(allocated) : roundToTwo(netAmount.mul(shareRatio));

    allocated = allocated.plus(settledAmount);

    return {
      userId: member.userId,
      memberRole: member.memberRole,
      sharePercentage: member.sharePercentage,
      settledAmount,
    };
  });
}

export async function settleContentPurchase(input: SettleContentPurchaseInput) {
  ensureValidCoinAmount(input.coinAmount);

  const projectId = input.workId ? catalogProjects.get(input.workId) : input.projectId;
  if (!projectId || (input.projectId && input.projectId !== projectId)) {
    throw new AppError("판매 준비 중인 작품입니다.", 409);
  }
  return prisma.$transaction(async (tx) => {
    const storefrontProject = Array.from(catalogProjects.values()).includes(projectId);
    const project = await tx.project.findFirst({
      where: { id: projectId, ...(storefrontProject && { storefrontSalesEnabled: true, episodes: { some: releasedPaidEpisode } }) },
      include: { members: { where: { isActive: true }, orderBy: [{ sharePercentage: "asc" }, { joinedAt: "asc" }] } },
    });
    if (!project || project.status !== ProjectStatus.PUBLISHED || !project.members.length) {
      throw new AppError("판매 준비 중인 작품입니다.", 409);
    }
    // Serialize even duplicate callbacks from the same buyer before inspecting their grant.
    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "userId" = ${input.buyerId} FOR UPDATE`;
    const access = await tx.contentAccess.findUnique({ where: { userId_projectId: { userId: input.buyerId, projectId } } });
    if (access) return { transactionId: access.transactionId, projectId, workId: input.workId, alreadyPurchased: true };
    if (project.priceCoins !== input.coinAmount) throw new AppError("작품 가격이 변경되었습니다. 결제창을 다시 열어 주세요.", 409);

    const shareTotal = project.members.reduce((sum, member) => sum.plus(member.sharePercentage), new Prisma.Decimal(0));
    if (!shareTotal.equals(ONE_HUNDRED)) {
      throw new AppError("Project member share percentages must add up to 100.", 409);
    }

    const grossAmount = toDecimal(project.priceCoins);
    const appliedFeeRate = getPlatformFeeRate(project.isOfficialPartner);
    const platformFeeAmount = roundToTwo(grossAmount.mul(appliedFeeRate));
    const netAmount = grossAmount.minus(platformFeeAmount);

    const debit = await tx.wallet.updateMany({
      where: { userId: input.buyerId, balance: { gte: grossAmount } },
      data: { balance: { decrement: grossAmount } },
    });
    if (!debit.count) throw new AppError("보유 코인이 부족합니다. 코인을 충전해 주세요.", 402);

    const transaction = await tx.transaction.create({
      data: {
        buyerId: input.buyerId,
        projectId,
        transactionType: TransactionType.CONTENT_PURCHASE,
        status: TransactionStatus.PAID,
        currency: "COIN",
        grossAmount,
        appliedFeeRate,
        platformFeeAmount,
        netAmount,
        coinAmount: input.coinAmount,
        purchasedAt: new Date(),
      },
    });

    const settlements = calculateMemberSettlements(netAmount, project.members);

    for (const settlement of settlements) {
      await tx.wallet.upsert({
        where: { userId: settlement.userId },
        create: {
          userId: settlement.userId,
          balance: settlement.settledAmount,
          currency: "COIN",
        },
        update: {
          balance: {
            increment: settlement.settledAmount,
          },
        },
      });
    }

    await tx.settlementDistribution.createMany({
      data: settlements.map((settlement) => ({
        transactionId: transaction.id,
        projectId,
        userId: settlement.userId,
        memberRole: settlement.memberRole,
        sharePercentage: settlement.sharePercentage,
        settledAmount: settlement.settledAmount,
      })),
    });

    await tx.contentAccess.create({
      data: { userId: input.buyerId, projectId: project.id, transactionId: transaction.id, grantType: AccessGrantType.PURCHASE },
    });

    await tx.project.update({
      where: { id: projectId },
      data: {
        totalRevenueAmount: { increment: grossAmount },
        totalNetRevenueAmount: { increment: netAmount },
      },
    });

    return {
      transactionId: transaction.id,
      projectId: project.id,
      workId: input.workId,
      alreadyPurchased: false,
      grossAmount: decimalToNumber(grossAmount),
      appliedFeeRate: decimalToNumber(appliedFeeRate),
      platformFeeAmount: decimalToNumber(platformFeeAmount),
      netAmount: decimalToNumber(netAmount),
      settlements: settlements.map((settlement) => ({
        userId: settlement.userId,
        memberRole: settlement.memberRole,
        sharePercentage: decimalToNumber(settlement.sharePercentage),
        settledAmount: decimalToNumber(settlement.settledAmount),
      })),
    };
  });
}
