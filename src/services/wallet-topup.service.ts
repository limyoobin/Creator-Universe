import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { portOneGet } from "../lib/portone.js";
import { inspectPayment, reflectsEvent, topUpTransition, type PaymentObservation, type ProviderPayment, type TopUpEvent } from "./wallet-topup-policy.js";

// A signed webhook passes no userId. For browser calls the order must belong to the session.
export async function reconcileTopUp(paymentId: string, userId?: string, event?: TopUpEvent) {
  const order = await prisma.walletTopUpOrder.findUnique({ where: { id: paymentId } });
  if (!order || (userId !== undefined && order.userId !== userId)) {
    if (userId === undefined) return null;
    throw new AppError("충전 주문을 찾을 수 없습니다.", 404);
  }
  let observation: PaymentObservation;
  try {
    const payment = await portOneGet<ProviderPayment>("/payments/" + encodeURIComponent(order.id));
    observation = inspectPayment(order, payment);
    if (event && !reflectsEvent(payment, event)) throw new AppError("결제 알림이 결제사 기록에 반영되기를 기다리고 있습니다.", 503);
  } catch (error) {
    if (!(error instanceof AppError) || error.statusCode !== 404) throw error;
    // A refund notification can race a replica that temporarily misses an already-paid order.
    // Keep retrying the notification even when the last recorded local state was PAID.
    if (event) throw new AppError("결제사에서 알림에 해당하는 결제 기록을 기다리고 있습니다.", 503);
    observation = { status: "NOT_FOUND" };
  }
  return prisma.$transaction(async tx => {
    // Serialize a redirect, webhook and manual retry on this one order. Keep the
    // network call outside the lock and apply only the verified cumulative delta.
    await tx.$queryRaw`SELECT id FROM "WalletTopUpOrder" WHERE id = ${order.id} FOR UPDATE`;
    const current = await tx.walletTopUpOrder.findUniqueOrThrow({ where: { id: order.id } });
    const next = topUpTransition(current, observation);
    const delta = next.creditedCoins - current.creditedCoins;
    if (current.status !== next.status || current.cancelledKrw !== next.cancelledKrw ||
        current.creditedCoins !== next.creditedCoins || current.paidAt?.getTime() !== next.paidAt?.getTime()) {
      await tx.walletTopUpOrder.update({ where: { id: order.id }, data: next });
    }
    const wallet = delta === 0
      ? await tx.wallet.findUniqueOrThrow({ where: { userId: order.userId } })
      : await tx.wallet.update({ where: { userId: order.userId }, data: { balance: { increment: delta } } });
    return { status: next.status, creditedCoins: next.creditedCoins, walletBalance: Number(wallet.balance), test: !order.live };
  });
}
