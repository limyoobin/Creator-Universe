import { Router } from "express";
import { z } from "zod";
import { purchasedAudio, purchasedLibrary, saleCatalog, settleContentPurchase } from "../services/settlement.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";

const purchaseSchema = z.object({
  workId: z.string().min(1).max(128).optional(),
  projectId: z.string().min(1).max(128).optional(),
  coinAmount: z.number().int().positive(),
});

export const settlementRouter = Router();

settlementRouter.get("/catalog", asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await saleCatalog() });
}));

settlementRouter.get("/me/library", asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, data: await purchasedLibrary(await getCurrentUserId(req)) });
}));

settlementRouter.get("/me/library/:workId/episodes", asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const userId = await getCurrentUserId(req);
  res.json({ success: true, data: await purchasedAudio(userId, String(req.params.workId)) });
}));

settlementRouter.post(
  "/content-purchase",
  asyncHandler(async (req, res) => {
    const buyerId = await getCurrentUserId(req);
    const payload = purchaseSchema.parse(req.body);

    const result = await settleContentPurchase({
      buyerId,
      projectId: payload.projectId,
      coinAmount: payload.coinAmount,
      workId: payload.workId,
    });

    res.status(201).json({
      success: true,
      message: "Content purchase settled successfully.",
      data: result,
    });
  }),
);
