import { AccessGrantType, MemberRole, Prisma, ProjectStatus, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";
import { ONE_HUNDRED, decimalToNumber, roundToTwo, toDecimal } from "../utils/decimal.js";

type SettleContentPurchaseInput = {
  buyerId: string;
  projectId: string;
  coinAmount: number;
  externalPaymentId?: string;
};

type MemberSettlement = {
  userId: string;
  memberRole: MemberRole;
  sharePercentage: Prisma.Decimal;
  settledAmount: Prisma.Decimal;
};

const DEFAULT_PROJECT_ID = "project-midnight-signal";

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

  return prisma.$transaction(async (tx) => {
    const buyer = await tx.user.findUnique({
      where: { id: input.buyerId },
      select: { id: true, role: true },
    });

    if (!buyer) {
      throw new AppError("Buyer not found.", 404);
    }

    if (input.projectId === DEFAULT_PROJECT_ID) {
      const existingProject = await tx.project.findUnique({
        where: { id: input.projectId },
        select: { id: true },
      });

      if (!existingProject) {
        await tx.project.create({
          data: {
            id: DEFAULT_PROJECT_ID,
            ownerId: buyer.id,
            title: "너의 이름을 부르는 목소리",
            slug: "midnight-signal",
            description: "크리에이터 유니버스 데모 콘텐츠",
            synopsis: "작가, 일러스트레이터, 성우가 함께 만든 협업형 콘텐츠입니다.",
            status: ProjectStatus.PUBLISHED,
            priceCoins: input.coinAmount,
            platformFeeRate: toDecimal(0.15),
            partnerFeeRate: toDecimal(0.08),
            settlementCurrency: "COIN",
            members: {
              create: {
                userId: buyer.id,
                memberRole: MemberRole.WRITER,
                sharePercentage: toDecimal(100),
              },
            },
          },
        });
      }
    }

    let project = await tx.project.findUnique({
      where: { id: input.projectId },
      include: {
        members: {
          where: { isActive: true },
          orderBy: [{ sharePercentage: "asc" }, { joinedAt: "asc" }],
        },
      },
    });

    if (!project) {
      throw new AppError("Project not found.", 404);
    }

    if (project.members.length === 0) {
      if (input.projectId !== DEFAULT_PROJECT_ID) {
        throw new AppError("No active project members found for settlement.", 409);
      }

      await tx.projectMember.upsert({
        where: {
          projectId_userId_memberRole: {
            projectId: project.id,
            userId: buyer.id,
            memberRole: MemberRole.WRITER,
          },
        },
        create: {
          projectId: project.id,
          userId: buyer.id,
          memberRole: MemberRole.WRITER,
          sharePercentage: toDecimal(100),
        },
        update: {
          isActive: true,
          sharePercentage: toDecimal(100),
        },
      });

      project = await tx.project.findUniqueOrThrow({
        where: { id: input.projectId },
        include: {
          members: {
            where: { isActive: true },
            orderBy: [{ sharePercentage: "asc" }, { joinedAt: "asc" }],
          },
        },
      });
    }

    const existingAccess = await tx.contentAccess.findUnique({
      where: {
        userId_projectId: {
          userId: input.buyerId,
          projectId: input.projectId,
        },
      },
    });

    if (existingAccess) {
      throw new AppError("This user already owns access to the project.", 409);
    }

    const shareTotal = project.members.reduce((sum, member) => sum.plus(member.sharePercentage), new Prisma.Decimal(0));
    if (!shareTotal.equals(ONE_HUNDRED)) {
      throw new AppError("Project member share percentages must add up to 100.", 409);
    }

    const grossAmount = toDecimal(input.coinAmount);
    const appliedFeeRate = project.isOfficialPartner ? project.partnerFeeRate : project.platformFeeRate;
    const platformFeeAmount = roundToTwo(grossAmount.mul(appliedFeeRate));
    const netAmount = grossAmount.minus(platformFeeAmount);

    const buyerWallet = await tx.wallet.findUnique({
      where: { userId: input.buyerId },
      select: { balance: true },
    });

    if (!buyerWallet || buyerWallet.balance.lt(grossAmount)) {
      throw new AppError("보유 코인이 부족합니다. 코인을 충전해 주세요.", 402);
    }

    const transaction = await tx.transaction.create({
      data: {
        buyerId: input.buyerId,
        projectId: input.projectId,
        transactionType: TransactionType.CONTENT_PURCHASE,
        status: TransactionStatus.PAID,
        currency: "COIN",
        grossAmount,
        appliedFeeRate,
        platformFeeAmount,
        netAmount,
        coinAmount: input.coinAmount,
        externalPaymentId: input.externalPaymentId,
        purchasedAt: new Date(),
      },
    });

    await tx.wallet.update({
      where: { userId: input.buyerId },
      data: {
        balance: {
          decrement: grossAmount,
        },
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
        projectId: input.projectId,
        userId: settlement.userId,
        memberRole: settlement.memberRole,
        sharePercentage: settlement.sharePercentage,
        settledAmount: settlement.settledAmount,
      })),
    });

    await tx.contentAccess.create({
      data: {
        userId: input.buyerId,
        projectId: input.projectId,
        transactionId: transaction.id,
        grantType: AccessGrantType.PURCHASE,
      },
    });

    await tx.project.update({
      where: { id: input.projectId },
      data: {
        totalRevenueAmount: { increment: grossAmount },
        totalNetRevenueAmount: { increment: netAmount },
      },
    });

    return {
      transactionId: transaction.id,
      projectId: project.id,
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
