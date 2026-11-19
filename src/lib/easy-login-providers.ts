import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { hashToken } from "../utils/auth.js";
import { identityReady, portOneConfig, portOneGet } from "./portone.js";
import { verifiedIdentityTime } from "../services/signup-identity.service.js";
import { kakaoAdminKey, kakaoJson } from "./kakao.js";

export type EasyProvider = "kakao" | "naver" | "pass";
const setting = (key: string) => process.env[key]?.trim() || "";
const urls = {
  kakao: { authorize: "https://kauth.kakao.com/oauth/authorize", token: "https://kauth.kakao.com/oauth/token", profile: "https://kapi.kakao.com/v1/user/access_token_info" },
  naver: { authorize: "https://nid.naver.com/oauth2.0/authorize", token: "https://nid.naver.com/oauth2.0/token", profile: "https://openapi.naver.com/v1/nid/me" },
};

function oauthClient(provider: "kakao" | "naver") {
  const clientId = setting(provider === "kakao" ? "KAKAO_REST_API_KEY" : "NAVER_CLIENT_ID");
  const secret = setting(provider === "kakao" ? "KAKAO_CLIENT_SECRET" : "NAVER_CLIENT_SECRET");
  return { clientId, secret };
}

export function easyProviderScope(provider: EasyProvider) {
  if (provider === "pass") {
    const {storeId, identityChannelKey, live} = portOneConfig();
    const key = setting("EASY_LOGIN_HMAC_SECRET");
    return identityReady() && live && Buffer.byteLength(key) >= 32
      ? hashToken(JSON.stringify([provider, storeId, identityChannelKey, hashToken(key)])) : null;
  }
  const {clientId, secret} = oauthClient(provider);
  return clientId && secret && (provider !== "kakao" || kakaoAdminKey()) ? hashToken(JSON.stringify([provider, clientId])) : null;
}

export function easyProviderStatus() {
  return { kakao: Boolean(easyProviderScope("kakao")), naver: Boolean(easyProviderScope("naver")), pass: Boolean(easyProviderScope("pass")) };
}

const redirectUri = (origin: string, provider: EasyProvider) => origin + "/auth/return/" + provider;
// The possession proof stays in the initiating tab and doubles as Kakao's S256 verifier.
export function easyStartPayload(provider: EasyProvider, origin: string, state: string, proof: string) {
  if (provider === "pass") {
    const {storeId, identityChannelKey: channelKey} = portOneConfig();
    return {identityVerificationId: state, storeId, channelKey};
  }
  const url = new URL(urls[provider].authorize);
  url.search = new URLSearchParams({response_type: "code", client_id: oauthClient(provider).clientId, state,
    redirect_uri: redirectUri(origin, provider)}).toString();
  if (provider === "kakao") {
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", createHash("sha256").update(proof).digest("base64url"));
  }
  return {authorizationUrl: url.toString()};
}

const upstreamError = () => new AppError("인증 제공사에서 로그인을 확인하지 못했습니다. 다시 시작해 주세요.", 502);
async function providerJson(url: string, options: RequestInit, parse: (text: string) => unknown = JSON.parse): Promise<unknown> {
  try {
    const response = await fetch(url, {...options, signal: AbortSignal.timeout(8000), redirect: "error"});
    if (!response.ok) { await response.body?.cancel(); throw upstreamError(); }
    return parse(await response.text());
  } catch { throw upstreamError(); }
}

const tokenResponse = z.object({access_token: z.string().min(1).max(16384)});
const kakaoProfile = z.object({id: z.string().regex(/^[1-9]\d{0,18}$/)});
const naverSubject = z.object({resultcode: z.literal("00"), response: z.object({id: z.string().trim().min(1).max(512)})});

export async function resolveEasySubject(provider: EasyProvider, origin: string, state: string, proof: string, code?: string) {
  if (provider === "pass") {
    const config = portOneConfig();
    const record = await portOneGet<Parameters<typeof verifiedIdentityTime>[0] & {verifiedCustomer?: {ci?: string}}>(
      "/identity-verifications/" + encodeURIComponent(state),
    );
    const verifiedAt = verifiedIdentityTime(record, {id: state, channelKey: config.identityChannelKey, live: true});
    const ci = record?.verifiedCustomer?.ci;
    if (typeof ci !== "string" || !ci.trim() || ci.length > 1024) {
      throw new AppError("이 인증 채널에서 로그인 식별정보를 확인할 수 없습니다. 다른 로그인 수단을 사용해 주세요.", 422);
    }
    const subjectHash = createHmac("sha256", setting("EASY_LOGIN_HMAC_SECRET"))
      .update(JSON.stringify(["pass-ci-v1", config.storeId, ci])).digest("hex");
    return {subjectHash, verifiedAt, kakaoUserId: null};
  }
  if (!code) throw new AppError("로그인 승인 코드가 없습니다. 다시 시도해 주세요.", 400);
  const {clientId, secret} = oauthClient(provider);
  const body = new URLSearchParams({grant_type: "authorization_code", client_id: clientId, client_secret: secret,
    redirect_uri: redirectUri(origin, provider), code});
  if (provider === "naver") body.set("state", state);
  else body.set("code_verifier", proof);
  const token = tokenResponse.safeParse(await providerJson(urls[provider].token, {method: "POST", body}));
  if (!token.success) throw upstreamError();
  const profile = await providerJson(urls[provider].profile, {headers: {Authorization: "Bearer " + token.data.access_token}},
    provider === "kakao" ? kakaoJson : JSON.parse);
  const id = provider === "kakao" ? kakaoProfile.safeParse(profile).data?.id : naverSubject.safeParse(profile).data?.response.id;
  if (!id) throw upstreamError();
  return {subjectHash: hashToken(JSON.stringify([provider, clientId, id])), verifiedAt: null, kakaoUserId: provider === "kakao" ? id : null};
}
