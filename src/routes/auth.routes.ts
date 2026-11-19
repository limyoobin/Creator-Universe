import { Router, urlencoded, type Request } from "express";
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
import { easyProviderStatus } from "../lib/easy-login-providers.js";
import { completeEasyLogin, easyConnections, registerEasyAccount, startEasyLogin } from "../services/easy-login.service.js";
import { hashToken } from "../utils/auth.js";
import { acceptKakaoUnlink } from "../services/kakao-unlink.service.js";

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

const easyProvider = z.enum(["kakao", "naver", "pass"]);
const easyProof = z.object({state: z.string().uuid(), proof: z.string().regex(/^[0-9a-f]{64}$/)});
const easyStart = z.object({mode: z.enum(["login","link"])});
const easyComplete = easyProof.extend({code: z.string().min(1).max(4096).optional()});
const easySignup = easyProof.extend({account: signupSchema});
const easySession = (req: Request) => {
  const token = getBearerToken(req);
  return token ? hashToken(token) : null;
};

authRouter.use("/easy", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
authRouter.post("/easy/kakao/unlink-callback", urlencoded({extended: false, limit: "4kb"}), asyncHandler(async (req, res) => {
  await acceptKakaoUnlink(req.header("authorization"), req.body?.user_id);
  res.status(200).end();
}));
authRouter.get("/easy/providers", (_req, res) => res.json({success: true, data: easyProviderStatus()}));
authRouter.get("/easy/connections", asyncHandler(async (req, res) => {
  const tokenHash = easySession(req);
  if (!tokenHash) throw new AppError("로그인 후 연결한 수단을 확인해 주세요.", 401);
  res.json({success: true, data: await easyConnections(tokenHash)});
}));
authRouter.post("/easy/:provider/start", asyncHandler(async (req, res) => {
  const provider = easyProvider.parse(req.params.provider);
  const {origin} = passkeyOrigin(req.header("origin"));
  const {mode} = easyStart.parse(req.body);
  const data = await startEasyLogin(provider, origin, mode, easySession(req));
  res.status(201).json({success: true, data});
}));
authRouter.post("/easy/:provider/complete", asyncHandler(async (req, res) => {
  const provider = easyProvider.parse(req.params.provider);
  const {origin} = passkeyOrigin(req.header("origin"));
  const data = await completeEasyLogin(provider, origin, easyComplete.parse(req.body), easySession(req));
  res.json({success: true, data});
}));
authRouter.post("/easy/:provider/signup", asyncHandler(async (req, res) => {
  const provider = easyProvider.parse(req.params.provider);
  const {origin} = passkeyOrigin(req.header("origin"));
  const {account, ...proof} = easySignup.parse(req.body);
  const data = await registerEasyAccount(provider, origin, proof, account);
  res.status(201).json({success: true, data});
}));

authRouter.post("/identity/start", asyncHandler(async (_req, res) => {
  const data = await startSignupIdentity();
  res.set("Cache-Control", "no-store").status(201).json({ success: true, data });
}));

authRouter.post("/identity/confirm", asyncHandler(async (req, res) => {
  const data = await confirmSignupIdentity(identityProofSchema.parse(req.body));
  res.set("Cache-Control", "no-store").json({ success: true, data });
}));

authRouter.post("/signup", (_req, res) => {
  res.status(410).json({success: false, message: "크리에이터 유니버스의 회원가입 화면에서 가입을 진행해 주세요."});
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
