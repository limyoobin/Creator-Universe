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
} from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";
import { getBearerToken } from "../utils/token.js";
import { AppError } from "../errors/app-error.js";
import { confirmSignupIdentity, startSignupIdentity } from "../services/signup-identity.service.js";
import { finishPasskeyLogin, finishPasskeyRegistration, passkeyOrigin, startPasskeyLogin, startPasskeyRegistration } from "../services/passkey.service.js";

const identityProofSchema = z.object({
  identityVerificationId: z.string().uuid(),
  proof: z.string().regex(/^[0-9a-f]{64}$/),
});

const signupSchema = z.object({
  email: z.string().trim().max(254).email(),
  username: z.string().trim().min(2).max(24).regex(/^[a-zA-Z0-9_]+$/, "Username can contain only letters, numbers, and underscores."),
  displayName: z.string().trim().min(1).max(20),
  identityVerification: identityProofSchema.optional(),
});

const base64url = (max: number) => z.string().min(1).max(max).regex(/^[A-Za-z0-9_-]+$/);
const browserCredential = z.object({
  type: z.literal("public-key"), id: base64url(2048), rawId: base64url(2048),
  clientExtensionResults: z.object({credProps: z.object({rk: z.boolean().optional()}).optional()}).default({}),
});
const registerVerify = z.object({
  ceremonyId: z.string().uuid(), account: signupSchema,
  response: browserCredential.extend({response: z.object({clientDataJSON: base64url(8200), attestationObject: base64url(131072)})}),
});
const loginVerify = z.object({
  ceremonyId: z.string().uuid(),
  response: browserCredential.extend({response: z.object({
    clientDataJSON: base64url(8200), authenticatorData: base64url(8192), signature: base64url(2048), userHandle: base64url(128),
  })}),
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

authRouter.post("/signup", (_req, res) => {
  res.status(410).json({success: false, message: "최신 회원가입 화면에서 패스키로 가입해 주세요."});
});

authRouter.post("/passkeys/register/options", asyncHandler(async (req, res) => {
  const site = passkeyOrigin(req.header("origin"));
  const data = await startPasskeyRegistration(site, signupSchema.parse(req.body));
  res.set("Cache-Control", "no-store").json({success: true, data});
}));
authRouter.post("/passkeys/register/verify", asyncHandler(async (req, res) => {
  const site = passkeyOrigin(req.header("origin"));
  const {ceremonyId, account, response} = registerVerify.parse(req.body);
  const data = await finishPasskeyRegistration(site, ceremonyId, account, response);
  res.set("Cache-Control", "no-store").status(201).json({success: true, data});
}));
authRouter.post("/passkeys/login/options", asyncHandler(async (req, res) => {
  const data = await startPasskeyLogin(passkeyOrigin(req.header("origin")));
  res.set("Cache-Control", "no-store").json({success: true, data});
}));
authRouter.post("/passkeys/login/verify", asyncHandler(async (req, res) => {
  const site = passkeyOrigin(req.header("origin"));
  const {ceremonyId, response} = loginVerify.parse(req.body);
  const data = await finishPasskeyLogin(site, ceremonyId, response);
  res.set("Cache-Control", "no-store").json({success: true, data});
}));

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
