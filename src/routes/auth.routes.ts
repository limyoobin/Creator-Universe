import { Router } from "express";
import { z } from "zod";
import {
  PASSWORD_RULE_MESSAGE,
  checkDisplayNameAvailability,
  checkUsernameAvailability,
  findUsernameByEmail,
  deactivateAccount,
  getUserBySessionToken,
  login,
  logout,
  resetPassword,
  signup,
} from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getBearerToken } from "../utils/token.js";
import { AppError } from "../errors/app-error.js";

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(2).max(24).regex(/^[a-zA-Z0-9_]+$/, "Username can contain only letters, numbers, and underscores."),
  displayName: z.string().trim().min(1).max(20),
  password: z.string().min(8).regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/, PASSWORD_RULE_MESSAGE),
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
