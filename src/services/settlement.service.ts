import { AccessGrantType, MemberRole, Prisma, TransactionStatus, TransactionType } from "@prisma/client";
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

    const project = await tx.project.findUnique({
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
      throw new AppError("No active project members found for settlement.", 409);
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
