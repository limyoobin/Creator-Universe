import { AppError } from "../errors/app-error.js";

export const topUpProducts = {
  "coin-1000": { coins: 1000, amountKrw: 1000 },
  "coin-3000": { coins: 3000, amountKrw: 3000 },
  "coin-5000": { coins: 5000, amountKrw: 5000 },
} as const;

type ExpectedOrder = {
  id: string; userId: string; amountKrw: number; coins: number; storeId: string; channelKey: string; live: boolean;
};
export type ProviderPayment = {
  id: string; status: string; storeId: string; channel?: { key?: string; type?: string };
  customer?: { id?: string }; method?: { type?: string }; currency?: string;
  amount?: { total: number; cancelled: number }; paidAt?: string;
  cancellations?: { id: string; status: string }[];
};
export type PaymentObservation = { status: string; cancelledKrw?: number; paidAt?: Date };
export type TopUpEvent = { type: string; cancellationId?: string };

// A cancellation notification can reach the server before the read API reflects it.
export function reflectsEvent(payment: ProviderPayment, event: TopUpEvent) {
  if (payment.status === "CANCELLED") return true;
  if (event.type === "Transaction.Cancelled") return false;
  if (event.type === "Transaction.PartialCancelled") {
    return payment.status === "PARTIAL_CANCELLED" && (!event.cancellationId ||
      payment.cancellations?.some(entry => entry.id === event.cancellationId && entry.status === "SUCCEEDED"));
  }
  if (event.type === "Transaction.Paid") return payment.status === "PAID" || payment.status === "PARTIAL_CANCELLED";
  return payment.status === "FAILED" || payment.status === "PAID" || payment.status === "PARTIAL_CANCELLED";
}

export function inspectPayment(order: ExpectedOrder, payment: ProviderPayment): PaymentObservation {
  const mismatch = () => new AppError("결제사 기록과 충전 주문이 일치하지 않습니다. 고객센터에 문의해 주세요.", 409);
  if (payment.id !== order.id || payment.storeId !== order.storeId) throw mismatch();
  if (payment.status === "READY") return { status: "READY" };
  if (payment.status === "FAILED") return { status: "FAILED" };
  if (!["PAID", "PARTIAL_CANCELLED", "CANCELLED"].includes(payment.status)) return { status: "PENDING" };
  const cancelled = payment.amount?.cancelled;
  if (payment.channel?.key !== order.channelKey || payment.channel.type !== (order.live ? "LIVE" : "TEST") ||
      payment.currency !== "KRW" || payment.amount?.total !== order.amountKrw ||
      payment.customer?.id !== order.userId || payment.method?.type !== "PaymentMethodCard" ||
      typeof cancelled !== "number" || !Number.isSafeInteger(cancelled) || cancelled < 0 || cancelled > order.amountKrw) throw mismatch();
  const expectedStatus = cancelled === 0 ? "PAID" : cancelled === order.amountKrw ? "CANCELLED" : "PARTIAL_CANCELLED";
  if (expectedStatus !== payment.status) throw mismatch();
  const paidAt = payment.paidAt ? new Date(payment.paidAt) : undefined;
  if ((paidAt && !Number.isFinite(paidAt.getTime())) || (!paidAt && expectedStatus !== "CANCELLED")) throw mismatch();
  return { status: expectedStatus, cancelledKrw: cancelled, paidAt };
}

// A delayed PAID response can arrive after a refund. Cancellation totals only advance.
export function topUpTransition(order: ExpectedOrder & { status: string; cancelledKrw: number; creditedCoins: number; paidAt: Date | null }, observation: PaymentObservation) {
  if (observation.cancelledKrw === undefined) {
    const status = order.paidAt || order.status === "CANCELLED" ? order.status : observation.status;
    return { status, cancelledKrw: order.cancelledKrw, creditedCoins: order.creditedCoins, paidAt: order.paidAt };
  }
  if (observation.cancelledKrw < order.cancelledKrw) {
    return { status: order.status, cancelledKrw: order.cancelledKrw, creditedCoins: order.creditedCoins, paidAt: order.paidAt };
  }
  return {
    status: observation.status,
    cancelledKrw: observation.cancelledKrw,
    creditedCoins: order.live ? Math.floor(order.coins * (order.amountKrw - observation.cancelledKrw) / order.amountKrw) : 0,
    paidAt: order.paidAt ?? observation.paidAt ?? null,
  };
}
