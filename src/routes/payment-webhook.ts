import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError } from "../errors/app-error.js";
import { portOneConfig } from "../lib/portone.js";
import { validWebhookSignature } from "../lib/portone-webhook-signature.js";
import { reconcileTopUp } from "../services/wallet-topup.service.js";

const eventSchema = z.object({ type: z.string(), data: z.object({
  storeId: z.string().optional(), paymentId: z.string().optional(), cancellationId: z.string().optional(),
}) });
const financialEvents = new Set(["Transaction.Paid", "Transaction.Cancelled", "Transaction.PartialCancelled", "Transaction.Failed"]);

export const portOneWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.PORTONE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new AppError("결제 알림 수신이 설정되지 않았습니다.", 503);
  if (!Buffer.isBuffer(req.body) || !validWebhookSignature(secret, req.header("webhook-id") ?? "",
      req.header("webhook-timestamp") ?? "", req.header("webhook-signature") ?? "", req.body)) {
    throw new AppError("결제 알림 서명을 확인할 수 없습니다.", 401);
  }
  let event;
  try { event = eventSchema.parse(JSON.parse(req.body.toString("utf8"))); }
  catch { throw new AppError("결제 알림 형식이 올바르지 않습니다.", 400); }
  const id = event.data.paymentId;
  if (event.data.storeId === portOneConfig().storeId && financialEvents.has(event.type) && id && /^cu-[a-f0-9]{32}$/.test(id)) {
    await reconcileTopUp(id, undefined, { type: event.type, cancellationId: event.data.cancellationId });
  }
  res.sendStatus(204);
});
