import { MemberRole, PartnerTier, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";

type CreateUserInput = {
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  isPartner?: boolean;
  partnerTier?: PartnerTier;
  creatorProfile?: {
    primaryRole: MemberRole;
    headline: string;
    bio: string;
    skills?: string[];
    availabilityNote?: string;
    responseRate?: number;
    followerCount?: number;
    completedProjects?: number;
    featured?: boolean;
    voiceDemoTitle?: string;
    voiceDemoDurationSeconds?: number;
    voiceWaveform?: number[];
  };
};

export async function createUser(input: CreateUserInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        role: input.role,
        isPartner: input.isPartner ?? false,
        partnerTier: input.partnerTier ?? PartnerTier.NONE,
        wallet: {
          create: {
            currency: "COIN",
          },
        },
        creatorProfile: input.creatorProfile
          ? {
              create: {
                primaryRole: input.creatorProfile.primaryRole,
                headline: input.creatorProfile.headline,
                bio: input.creatorProfile.bio,
                skills: input.creatorProfile.skills ?? [],
                availabilityNote: input.creatorProfile.availabilityNote,
                responseRate: input.creatorProfile.responseRate ?? 0,
                followerCount: input.creatorProfile.followerCount ?? 0,
                completedProjects: input.creatorProfile.completedProjects ?? 0,
                featured: input.creatorProfile.featured ?? false,
                voiceDemoTitle: input.creatorProfile.voiceDemoTitle,
                voiceDemoDurationSeconds: input.creatorProfile.voiceDemoDurationSeconds,
                voiceWaveform: input.creatorProfile.voiceWaveform ?? [],
              },
            }
          : undefined,
      },
      include: {
        wallet: true,
        creatorProfile: true,
      },
    });

    return user;
  });
}

export async function getWalletSnapshot(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
    },
  });

  if (!wallet) {
    throw new AppError("Wallet not found.", 404);
  }

  return wallet;
}

export async function getWalletDetail(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const refundWindowStart = new Date(now);
  refundWindowStart.setDate(refundWindowStart.getDate() - 7);

  const [wallet, purchases, distributions] = await Promise.all([
    getWalletSnapshot(userId),
    prisma.transaction.findMany({
      where: {
        buyerId: userId,
        status: "PAID",
      },
      include: {
        project: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.settlementDistribution.findMany({
      where: {
        userId,
      },
      include: {
        project: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
  ]);

  const monthlyPurchases = purchases.filter((item) => item.createdAt >= monthStart);
  const monthlyDistributions = distributions.filter((item) => item.createdAt >= monthStart);
  const monthlySpend = monthlyPurchases.reduce((total, item) => total + Number(item.grossAmount), 0);
  const monthlyEarned = monthlyDistributions.reduce((total, item) => total + Number(item.settledAmount), 0);
  const refundableCoins = purchases
    .filter((item) => item.createdAt >= refundWindowStart && item.transactionType === "CONTENT_PURCHASE")
    .reduce((total, item) => total + Number(item.coinAmount ?? item.grossAmount), 0);

  const purchaseLedger = purchases.map((item) => ({
    id: item.id,
    type: item.transactionType === "REFUND" ? "REFUND" : "SPEND",
    title: `${item.project.title} 열람권 구매`,
    description: "구매 즉시 콘텐츠 접근권이 발급되고 창작팀 정산 큐에 반영되었습니다.",
    amount: -Number(item.coinAmount ?? item.grossAmount),
    status: item.createdAt >= refundWindowStart ? "환불 가능" : "완료",
    createdAt: item.createdAt.toISOString(),
    projectTitle: item.project.title,
  }));

  const settlementLedger = distributions.map((item) => ({
    id: item.id,
    type: "SETTLEMENT",
    title: `${item.project.title} 정산 입금`,
    description: `${Number(item.sharePercentage)}% 지분율에 따라 자동 분배된 창작자 수익입니다.`,
    amount: Number(item.settledAmount),
    status: "완료",
    createdAt: item.createdAt.toISOString(),
    projectTitle: item.project.title,
  }));

  return {
    balance: Number(wallet.balance),
    monthlySpend,
    monthlyEarned,
    refundableCoins,
    bonusCoins: 0,
    autoChargeEnabled: true,
    nextChargeDate: "2026-05-15",
    paymentMethod: "등록된 대표 결제 수단",
    payoutAccount: "정산 계좌 등록 필요",
    transactions: [...purchaseLedger, ...settlementLedger].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}
