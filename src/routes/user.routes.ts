import { Router, type Request } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { getWalletDetail, getWalletSnapshot } from "../services/user.service.js";
import { createTopUp, reconcileTopUp } from "../services/wallet-topup.service.js";
import { getUserIdBySessionToken } from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";
import { getBearerToken } from "../utils/token.js";

const productSchema = z.object({ productId: z.enum(["coin-1000", "coin-3000", "coin-5000"]) }).strict();
const paymentIdSchema = z.string().regex(/^cu-[a-f0-9]{32}$/);
export const userRouter = Router();

async function walletSession(req: Request) {
  const token = getBearerToken(req);
  const userId = token ? await getUserIdBySessionToken(token) : null;
  if (!userId) throw new AppError("코인을 충전하려면 로그인해 주세요.", 401);
  return userId;
}

userRouter.post("/", (_req, res) => {
  res.status(410).json({ success: false, message: "회원가입 화면에서 계정을 만들어 주세요." });
});

userRouter.get(
  "/me/wallet",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const wallet = await getWalletSnapshot(userId);

    res.json({
      success: true,
      data: wallet,
    });
  }),
);

userRouter.get(
  "/me/wallet/detail",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const wallet = await getWalletDetail(userId);

    res.json({
      success: true,
      data: wallet,
    });
  }),
);

userRouter.post("/me/wallet/charge", (_req, res) => {
  res.status(410).json({ success: false, message: "새 결제창에서 코인을 충전해 주세요." });
});

userRouter.post("/me/wallet/orders", asyncHandler(async (req, res) => {
  const userId = await walletSession(req);
  const { productId } = productSchema.parse(req.body);
  res.status(201).json({ success: true, data: await createTopUp(userId, productId) });
}));

userRouter.post("/me/wallet/orders/:paymentId/confirm", asyncHandler(async (req, res) => {
  const userId = await walletSession(req);
  const paymentId = paymentIdSchema.parse(req.params.paymentId);
  res.json({ success: true, data: await reconcileTopUp(paymentId, userId) });
}));
