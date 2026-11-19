import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  PASSWORD_RULE_MESSAGE,
  checkDisplayNameAvailability,
  checkUsernameAvailability,
  findUsernameByEmail,
  deactivateAccount,
  enableCreatorMode,
  getUserBySessionToken,
  login,
  logout,
  resetPassword,
  signup,
} from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";
import { getBearerToken } from "../utils/token.js";
import { AppError } from "../errors/app-error.js";
import { confirmSignupIdentity, startSignupIdentity } from "../services/signup-identity.service.js";

const identityProofSchema = z.object({
  identityVerificationId: z.string().uuid(),
  proof: z.string().regex(/^[0-9a-f]{64}$/),
});

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(2).max(24).regex(/^[a-zA-Z0-9_]+$/, "Username can contain only letters, numbers, and underscores."),
  displayName: z.string().trim().min(1).max(20),
  password: z.string().min(8).regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/, PASSWORD_RULE_MESSAGE),
  role: z.enum([UserRole.READER, UserRole.CREATOR]).default(UserRole.READER),
  identityVerification: identityProofSchema.optional(),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const findIdSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  newPassword: z.string().min(8).regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/, PASSWORD_RULE_MESSAGE),
});

const checkUsernameSchema = z.object({
  username: z.string().trim().min(2).max(24).regex(/^[a-zA-Z0-9_]+$/),
});

const checkNicknameSchema = z.object({
  displayName: z.string().trim().min(1).max(20),
});

export const authRouter = Router();

authRouter.post("/identity/start", asyncHandler(async (_req, res) => {
  const data = await startSignupIdentity();
  res.set("Cache-Control", "no-store").status(201).json({ success: true, data });
}));

authRouter.post("/identity/confirm", asyncHandler(async (req, res) => {
  const data = await confirmSignupIdentity(identityProofSchema.parse(req.body));
  res.set("Cache-Control", "no-store").json({ success: true, data });
}));

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const payload = signupSchema.parse(req.body);
    const result = await signup(payload);

    res.status(201).json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const result = await login(payload.username, payload.password);

    res.json({
      success: true,
      data: result,
    });
  }),
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const token = getBearerToken(req);
    const user = token ? await getUserBySessionToken(token) : null;

    res.json({
      success: true,
      data: user,
    });
  }),
);

authRouter.post(
  "/me/creator-mode",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const user = await enableCreatorMode(userId);

    res.json({
      success: true,
      data: { user },
    });
  }),
);

authRouter.post(
  "/check-username",
  asyncHandler(async (req, res) => {
    const payload = checkUsernameSchema.parse(req.body);
    const result = await checkUsernameAvailability(payload.username);

    res.json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/check-nickname",
  asyncHandler(async (req, res) => {
    const payload = checkNicknameSchema.parse(req.body);
    const result = await checkDisplayNameAvailability(payload.displayName);

    res.json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = getBearerToken(req);
    if (!token) {
      throw new AppError("Authorization token is required.", 401);
    }

    const result = await logout(token);

    res.json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/find-id",
  asyncHandler(async (req, res) => {
    const payload = findIdSchema.parse(req.body);
    const result = await findUsernameByEmail(payload.email);

    res.json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const payload = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(payload.username, payload.email, payload.newPassword);

    res.json({
      success: true,
      data: result,
    });
  }),
);

authRouter.delete(
  "/me",
  asyncHandler(async (req, res) => {
    const token = getBearerToken(req);
    if (!token) {
      throw new AppError("Authorization token is required.", 401);
    }

    const result = await deactivateAccount(token);

    res.json({
      success: true,
      data: result,
    });
  }),
);
