import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { AppError } from "../src/errors/app-error.js";
import { validWebhookSignature } from "../src/lib/portone-webhook-signature.js";
import { inspectPayment, reflectsEvent, topUpTransition, type ProviderPayment } from "../src/services/wallet-topup-policy.js";

const order = {
  id: "cu-test", userId: "buyer", amountKrw: 1000, coins: 1000, storeId: "store", channelKey: "card", live: true,
  status: "PENDING", cancelledKrw: 0, creditedCoins: 0, paidAt: null,
};
const paid: ProviderPayment = {
  id: order.id, storeId: order.storeId, status: "PAID", amount: { total: 1000, cancelled: 0 },
  method: { type: "PaymentMethodCard" }, customer: { id: order.userId }, currency: "KRW",
  channel: { key: order.channelKey, type: "LIVE" }, paidAt: "2026-01-01T10:00:00Z",
};
const accept = (state: typeof order | (Omit<typeof order, "paidAt"> & { paidAt: Date | null }), payment: ProviderPayment) =>
  ({ ...state, ...topUpTransition(state, inspectPayment(state, payment)) });
for (const mismatch of [
  { id: "other" }, { storeId: "other" }, { currency: "USD" }, { customer: { id: "other" } },
  { channel: { key: "wrong", type: "LIVE" } }, { channel: { key: "card", type: "TEST" } },
  { method: { type: "PaymentMethodVirtualAccount" } }, { amount: { total: 900, cancelled: 0 } },
  { amount: { total: 1000, cancelled: 10 } }, { status: "CANCELLED" }, { paidAt: "invalid" }, { paidAt: undefined },
]) {
  assert.throws(() => inspectPayment(order, { ...paid, ...mismatch }), (err: unknown) => err instanceof AppError && err.statusCode === 409);
}
const partial = { ...paid, status: "PARTIAL_CANCELLED", amount: { total: 1000, cancelled: 250 } };
const cancelled = { ...paid, status: "CANCELLED", paidAt: undefined, amount: { total: 1000, cancelled: 1000 } };
const credited = accept(order, paid);
const afterPartial = accept(credited, partial);
assert.equal(credited.creditedCoins, 1000);
assert.deepEqual(accept(credited, paid), credited);
assert.equal(afterPartial.creditedCoins, 750);
assert.deepEqual(accept(afterPartial, paid), afterPartial);
assert.deepEqual(accept(afterPartial, partial), afterPartial);
assert.deepEqual(accept(afterPartial, { ...paid, status: "READY" }), afterPartial);
const reversed = accept(afterPartial, cancelled);
assert.equal(reversed.creditedCoins, 0);
assert.deepEqual(reversed.paidAt, credited.paidAt);
assert.deepEqual(accept(reversed, partial), reversed);
const neverPaid = accept(order, cancelled);
assert.equal(neverPaid.paidAt, null);
assert.deepEqual(accept(neverPaid, { ...paid, status: "FAILED" }), neverPaid);
assert.equal(accept(order, { ...paid, status: "PAY_PENDING" }).creditedCoins, 0);
assert.equal(accept({ ...order, live: false }, { ...paid, channel: { key: order.channelKey, type: "TEST" } }).creditedCoins, 0);

const refundEvent = { type: "Transaction.PartialCancelled", cancellationId: "refund-b" };
assert.equal(reflectsEvent(paid, refundEvent), false);
assert.equal(reflectsEvent({ ...partial, cancellations: [{ id: "refund-a", status: "SUCCEEDED" }] }, refundEvent), false);
assert.equal(reflectsEvent({ ...partial, cancellations: [{ id: "refund-b", status: "SUCCEEDED" }] }, refundEvent), true);
assert.equal(reflectsEvent(cancelled, { type: "Transaction.Paid" }), true);
assert.equal(reflectsEvent(partial, { type: "Transaction.Cancelled" }), false);

const key = Buffer.from("fictional-local-test-key");
const secret = "whsec_" + key.toString("base64");
const id = "local-webhook";
const timestamp = "1767261600";
const now = Number(timestamp) * 1000;
const raw = Buffer.from('{"type":"Transaction.Paid"}');
const sig = "v1," + createHmac("sha256", key).update(id + "." + timestamp + ".").update(raw).digest("base64");
assert.equal(validWebhookSignature(secret, id, timestamp, "v1,unknown " + sig, raw, now), true);
assert.equal(validWebhookSignature(secret, id, timestamp, sig, Buffer.from(raw + " "), now), false);
assert.equal(validWebhookSignature(secret, "another-event", timestamp, sig, raw, now), false);
assert.equal(validWebhookSignature(secret, id, timestamp, sig, raw, now + 301_000), false);
assert.equal(validWebhookSignature(secret, id, timestamp, sig, raw, now - 301_000), false);
console.log("Wallet top-up checks passed.");
