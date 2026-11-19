import { loadPortOne, post, type ApiRequest, type IdentityProof } from "./portone";

export const easyLabels = { kakao: "카카오", naver: "네이버", pass: "PASS" } as const;
export type EasyProvider = keyof typeof easyLabels;
export type EasyMode = "login" | "link";
type Pending = {
  state: string; proof: string; provider: EasyProvider; mode: EasyMode; expiresAt: string;
  returnPath: string; signup?: boolean;
};
type Started = Pick<Pending, "state" | "proof" | "expiresAt"> & {
  authorizationUrl?: string; identityVerificationId?: string; storeId?: string; channelKey?: string;
};
type Session<U> = { kind: "session"; token: string; user: U };
export type EasyOutcome<U> = Session<U> | {kind: "linked"} | {kind: "signup"};
export type EasyReturn = { provider: EasyProvider; state: string | null; code: string | null; failed: boolean; mode: EasyMode };
const key = "creator-universe-easy-login-v1";
const authHost = { kakao: "https://kauth.kakao.com", naver: "https://nid.naver.com" };

export function pendingEasy(): Pending | null {
  try {
    const flow = JSON.parse(sessionStorage.getItem(key) || "null") as Pending | null;
    if (flow && Object.prototype.hasOwnProperty.call(easyLabels, flow.provider) && (flow.mode === "login" || flow.mode === "link")
      && typeof flow.state === "string" && typeof flow.proof === "string" && Date.parse(flow.expiresAt) > Date.now()) return flow;
  } catch { /* Storage is unavailable on some private browser configurations. */ }
  return null;
}
export function clearEasy() { try { sessionStorage.removeItem(key); } catch { /* Already inaccessible. */ } }
function keep(flow: Pending) {
  try { sessionStorage.setItem(key, JSON.stringify(flow)); }
  catch { throw new Error("이 브라우저에서 인증을 이어갈 수 없어요. 저장 공간을 허용한 뒤 다시 시도해 주세요."); }
}
function entryPath() {
  const params = new URLSearchParams(window.location.search);
  const safe = new URL("/", window.location.origin);
  for (const name of ["studio","view","work","episode","app","shell"]) {
    const value = params.get(name);
    if (value) safe.searchParams.set(name, value);
  }
  return safe.pathname + safe.search;
}
export function readEasyReturn(): EasyReturn | null {
  const match = /^\/auth\/return\/(kakao|naver|pass)\/?$/.exec(window.location.pathname);
  if (!match) return null;
  const provider = match[1] as EasyProvider;
  const query = new URLSearchParams(window.location.search);
  const flow = pendingEasy();
  const state = query.get(provider === "pass" ? "identityVerificationId" : "state");
  const matches = flow?.provider === provider && flow.state === state;
  const path = matches && /^\/(?:\?|$)/.test(flow.returnPath) ? flow.returnPath : "/";
  // Drop the provider code before assets, analytics or other page links can reference it.
  window.history.replaceState(window.history.state, "", path);
  return { provider, state, mode: matches ? flow.mode : "login",
    code: provider === "pass" ? null : query.get("code"), failed: query.has(provider === "pass" ? "code" : "error") };
}

async function complete<U>(request: ApiRequest, flow: Pending, token: string | null, code?: string) {
  if (pendingEasy()?.state !== flow.state || (flow.mode === "link" && !token)) throw new Error("인증이 만료됐어요. 로그인 방법을 다시 선택해 주세요.");
  const result = await post<EasyOutcome<U>>(request, "/api/auth/easy/" + flow.provider + "/complete",
    flow.mode === "link" ? token : null, {state: flow.state, proof: flow.proof, ...(code ? {code} : {})});
  if (pendingEasy()?.state !== flow.state) throw new Error("인증을 다시 시작해 주세요.");
  if (result.kind === "signup") keep({...flow, signup: true});
  else clearEasy();
  return result;
}
export function completeReturn<U>(request: ApiRequest, returned: EasyReturn, token: string | null) {
  const flow = pendingEasy();
  if (!flow || flow.provider !== returned.provider || returned.state !== flow.state) {
    throw new Error("인증을 시작한 탭에서 다시 진행해 주세요.");
  }
  if (returned.failed || (returned.provider !== "pass" && !returned.code)) {
    clearEasy();
    throw new Error("인증이 완료되지 않았어요. 로그인 방법을 다시 선택해 주세요.");
  }
  return complete<U>(request, flow, token, returned.code ?? undefined);
}
export async function beginEasy<U>(request: ApiRequest, provider: EasyProvider, mode: EasyMode, token: string | null, signal: AbortSignal) {
  if (mode === "link" && !token) throw new Error("로그인한 뒤 내 계정에서 연결해 주세요.");
  const sdk = provider === "pass" ? await loadPortOne() : null;
  signal.throwIfAborted();
  const start = await post<Started>(request, "/api/auth/easy/" + provider + "/start", mode === "link" ? token : null, {mode});
  signal.throwIfAborted();
  const flow: Pending = { state: start.state, proof: start.proof, expiresAt: start.expiresAt, provider, mode, returnPath: entryPath() };
  keep(flow);
  if (provider !== "pass") {
    const url = new URL(start.authorizationUrl ?? "");
    if (url.origin !== authHost[provider] || url.username || url.password) throw new Error("인증 페이지 주소를 확인할 수 없어요.");
    window.location.assign(url.href);
    return null;
  }
  if (!sdk || !start.storeId || !start.channelKey || start.identityVerificationId !== flow.state) throw new Error("본인인증 설정을 확인할 수 없어요.");
  const result = await sdk.requestIdentityVerification({ storeId: start.storeId, channelKey: start.channelKey,
    identityVerificationId: flow.state, redirectUrl: window.location.origin + "/auth/return/pass",
    bypass: {inicisUnified: {flgFixedUser: "N"}} });
  signal.throwIfAborted();
  if (!result) return null; // Redirect-based browsers continue on the registered return page.
  if (result.code || result.identityVerificationId !== flow.state) { clearEasy(); throw new Error("휴대폰 본인인증이 완료되지 않았어요."); }
  return complete<U>(request, flow, token);
}
export async function finishEasySignup<U>(request: ApiRequest, account: {
  username: string; email: string; displayName: string; identityVerification?: IdentityProof;
}) {
  const flow = pendingEasy();
  if (!flow?.signup || flow.mode !== "login") throw new Error("가입 인증이 만료됐어요. 인증을 다시 시작해 주세요.");
  const result = await post<Session<U>>(request, "/api/auth/easy/" + flow.provider + "/signup", null, {state: flow.state, proof: flow.proof, account});
  if (pendingEasy()?.state !== flow.state) throw new Error("인증을 다시 시작해 주세요.");
  clearEasy();
  return result;
}
