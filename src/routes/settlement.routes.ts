import { Router } from "express";
import { z } from "zod";
import { settleContentPurchase } from "../services/settlement.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";

const purchaseSchema = z.object({
  projectId: z.string().min(1),
  coinAmount: z.number().int().positive(),
  externalPaymentId: z.string().min(1).optional(),
});

export const settlementRouter = Router();

settlementRouter.post(
  "/content-purchase",
  asyncHandler(async (req, res) => {
    const buyerId = await getCurrentUserId(req);
    const payload = purchaseSchema.parse(req.body);

    const result = await settleContentPurchase({
      buyerId,
      projectId: payload.projectId,
      coinAmount: payload.coinAmount,
      externalPaymentId: payload.externalPaymentId,
    });

    res.status(201).json({
      success: true,
      message: "Content purchase settled successfully.",
      data: result,
    });
  }),
);
