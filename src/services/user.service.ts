import { TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";

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

  const [wallet, transactions, distributions, topUps] = await Promise.all([
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
    prisma.walletTopUpOrder.findMany({
      where: { userId, live: true, paidAt: { not: null } },
      orderBy: { updatedAt: "desc" }, take: 20,
    }),
  ]);

  const charges = transactions.filter((item) => item.transactionType === TransactionType.COIN_PURCHASE);
  const purchases = transactions.filter((item) => item.transactionType !== TransactionType.COIN_PURCHASE);
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
    status: "완료",
    createdAt: item.createdAt.toISOString(),
    projectTitle: item.project.title,
  }));

  const chargeLedger = charges.map((item) => ({
    id: item.id,
    type: "CHARGE",
    title: `코인 ${Number(item.coinAmount ?? item.netAmount).toLocaleString("ko-KR")} 충전`,
    description: `${Number(item.grossAmount).toLocaleString("ko-KR")}원 결제로 코인이 충전되었습니다.`,
    amount: Number(item.coinAmount ?? item.netAmount),
    status: "완료",
    createdAt: item.createdAt.toISOString(),
    projectTitle: item.project.title,
  }));

  const confirmedTopUps = topUps.flatMap(order => {
    const purchase = {
      id: order.id, type: "CHARGE", title: `${order.coins.toLocaleString("ko-KR")}코인 충전`,
      description: `카드 결제 ${order.amountKrw.toLocaleString("ko-KR")}원`,
      amount: order.coins, status: "완료", createdAt: order.paidAt!.toISOString(), projectTitle: "코인 충전",
    };
    if (order.cancelledKrw === 0) return [purchase];
    return [purchase, {
      id: order.id + "-refund", type: "REFUND", title: "코인 충전 취소",
      description: `누적 취소 금액 ${order.cancelledKrw.toLocaleString("ko-KR")}원`,
      amount: order.creditedCoins - order.coins, status: order.status === "CANCELLED" ? "전체 취소" : "부분 취소",
      createdAt: order.updatedAt.toISOString(), projectTitle: "코인 충전",
    }];
  });

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
    autoChargeEnabled: false,
    nextChargeDate: "-",
    paymentMethod: topUps.length > 0 ? "최근 충전 수단 · 카드" : "등록된 대표 결제 수단 없음",
    payoutAccount: "정산 계좌 등록 필요",
    transactions: [...purchaseLedger, ...chargeLedger, ...confirmedTopUps, ...settlementLedger].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}
