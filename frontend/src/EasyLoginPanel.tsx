import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Smartphone } from "lucide-react";
import { beginEasy, clearEasy, completeReturn, easyLabels, finishEasySignup, pendingEasy, type EasyMode, type EasyOutcome, type EasyProvider, type EasyReturn } from "./easy-login";
import { IdentityCheck } from "./IdentityCheck";
import { saveChallenge, useIntegrationStatus, type ApiRequest, type IdentityProof } from "./portone";
import "./easy-login.css";

const providers: EasyProvider[] = ["kakao", "naver", "pass"];
type Availability = Record<EasyProvider, boolean>;
const errorText = (error: unknown) => error instanceof Error ? error.message : "인증을 완료하지 못했어요. 다시 시도해 주세요.";

function ProviderMark({provider}: {provider: EasyProvider}) {
  if (provider === "naver") return <img src="/auth/naver-login-icon.png" width="32" height="32" alt="" />;
  if (provider === "pass") return <Smartphone size={20} aria-hidden="true" />;
  return <svg width="20" height="20" viewBox="61.45 16.45 13.1 13.1" aria-hidden="true">
    <path fill="#191919" d="M68.001 16.5225C64.4222 16.5225 61.5225 19.0037 61.5225 22.0641C61.5225 24.0312 62.7219 25.7596 64.5292 26.7423L63.9181 29.2113C63.8954 29.285 63.9132 29.364 63.9619 29.4184C63.9975 29.457 64.0461 29.478 64.0931 29.478C64.1337 29.478 64.1742 29.464 64.2082 29.4341L66.834 27.5144C67.2117 27.5723 67.6007 27.6039 67.9994 27.6039C71.5767 27.6039 74.478 25.1226 74.478 22.0623C74.478 19.002 71.5783 16.5225 68.001 16.5225Z"/>
  </svg>;
}

type Props<U> = {
  request: ApiRequest; token: string | null; mode: EasyMode; returned: EasyReturn | null;
  identityReturn: {id: string | null; error: boolean} | null;
  onAuth: (user: U, token: string) => void; onUseExisting: () => void;
  onAvailable: (ready: boolean) => void; onExclusive: (value: boolean) => void;
};

export function EasyLoginPanel<U>({request, token, mode, returned, identityReturn, onAuth, onUseExisting, onAvailable, onExclusive}: Props<U>) {
  const [flags, setFlags] = useState<Availability | null>(null);
  const [connected, setConnected] = useState<EasyProvider[]>([]);
  const [statusError, setStatusError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [signup, setSignup] = useState(() => {
    const flow = pendingEasy();
    return flow?.signup && mode === "login" && (!returned || returned.state === flow.state) ? flow : null;
  });
  const [identity, setIdentity] = useState<IdentityProof | null>(null);
  const integration = useIntegrationStatus(request, Boolean(signup && signup.provider !== "pass"));
  const [busy, setBusy] = useState(Boolean(returned && !signup));
  const [message, setMessage] = useState("");
  const startAttempt = useRef<AbortController | null>(null);
  const callback = useRef<Promise<EasyOutcome<U>> | null>(null);
  const [callbackHandled, setCallbackHandled] = useState(false);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    const controller = new AbortController();
    const options = {signal: controller.signal};
    setStatusError(false);
    Promise.all([
      request<Availability>("/api/auth/easy/providers", null, options),
      mode === "link" ? request<{providers: EasyProvider[]}>("/api/auth/easy/connections", token, options) : Promise.resolve({providers: []}),
    ]).then(([settings, connections]) => {
      if (controller.signal.aborted) return;
      setFlags(settings); setConnected(connections.providers); onAvailable(providers.some(provider => settings[provider]));
    }).catch(() => {
      if (!controller.signal.aborted) { setStatusError(true); setFlags(null); onAvailable(false); }
    });
    return () => controller.abort();
  }, [request, mode, token, refresh, onAvailable]);

  useEffect(() => { onExclusive(Boolean(signup) || busy); }, [signup, busy, onExclusive]);
  useEffect(() => {
    if (!signup) return;
    const timer = window.setTimeout(() => {
      clearEasy(); setSignup(null); setMessage("가입 인증이 만료됐어요. 로그인 방법을 다시 선택해 주세요.");
    }, Math.max(0, Date.parse(signup.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [signup]);
  useEffect(() => () => startAttempt.current?.abort(), []);

  function receive(result: EasyOutcome<U>, provider: EasyProvider) {
    if (result.kind === "session") onAuthRef.current(result.user, result.token);
    else if (result.kind === "signup") setSignup(pendingEasy());
    else {
      setConnected(list => [...new Set([...list, provider])]);
      setRefresh(value => value + 1);
      setMessage(easyLabels[provider] + " 로그인을 연결했어요.");
    }
  }

  useEffect(() => {
    if (!returned || callbackHandled || signup) return;
    let mounted = true;
    callback.current ??= Promise.resolve().then(() => completeReturn<U>(request, returned, token));
    callback.current.then(result => {
      if (mounted) receive(result, returned.provider);
    }).catch(error => { if (mounted) setMessage(errorText(error)); })
      .finally(() => { if (mounted) { setBusy(false); setCallbackHandled(true); } });
    return () => { mounted = false; };
  }, [returned, request, token, signup, callbackHandled]);

  async function start(provider: EasyProvider) {
    if (startAttempt.current || busy || !flags?.[provider]) return;
    const controller = new AbortController();
    startAttempt.current = controller; setBusy(true); setMessage("");
    try {
      const result = await beginEasy<U>(request, provider, mode, token, controller.signal);
      if (result && !controller.signal.aborted) receive(result, provider);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(errorText(error));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      startAttempt.current = null;
    }
  }
  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !signup || startAttempt.current) return;
    const data = new FormData(event.currentTarget);
    const controller = new AbortController();
    startAttempt.current = controller; setBusy(true); setMessage("");
    try {
      const result = await finishEasySignup<U>(request, {
        username: String(data.get("username")).trim(), email: String(data.get("email")).trim(),
        displayName: String(data.get("displayName")).trim(), ...(identity ? {identityVerification: identity} : {}),
      });
      if (!controller.signal.aborted) { saveChallenge(null); receive(result, signup.provider); }
    } catch (error) {
      if (!controller.signal.aborted) setMessage(errorText(error));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      startAttempt.current = null;
    }
  }
  const enabled = providers.filter(provider => flags?.[provider] || connected.includes(provider));
  const missing = providers.filter(provider => !enabled.includes(provider)).map(provider => easyLabels[provider]);
  return <div className="easy-panel">
    {message && <p className="easy-feedback" role="status">{message}</p>}
    {signup ? <form className="auth-form easy-signup" onSubmit={register}>
      <strong className="easy-confirmed"><Check size={16}/> {easyLabels[signup.provider]} 인증 완료</strong>
      <p className="auth-help">처음 오셨나요? 공개 프로필에 쓸 닉네임을 정하고 통합 계정을 만들어 주세요.</p>
      {signup.provider !== "pass" && <IdentityCheck request={request} status={integration.status} onVerified={setIdentity} returned={identityReturn} />}
      {integration.failed && <p className="auth-help">가입 조건을 확인할 수 없어요. <button type="button" onClick={integration.retry}>다시 확인</button></p>}
      <label>닉네임<input name="displayName" autoComplete="nickname" maxLength={20} required /></label>
      <label>이메일<input name="email" type="email" autoComplete="email" required /></label>
      <label>아이디<input name="username" autoComplete="username" minLength={2} maxLength={24} pattern="[A-Za-z0-9_]+" placeholder="영문, 숫자, 밑줄 2~24자" required /></label>
      <button type="submit" className="primary-button" disabled={busy || (signup.provider !== "pass" && (!integration.status || (integration.status.identityRequired && !identity)))}> {busy ? "가입 처리 중…" : "통합 계정 만들기"}</button>
      <button type="button" className="ghost-button" disabled={busy} onClick={() => { clearEasy(); setSignup(null); setMessage(""); setCallbackHandled(true); onUseExisting(); }}>기존 계정으로 로그인</button>
      <small className="auth-help">기존 계정에는 로그인 후 ‘내 계정’에서 이 인증 수단을 연결할 수 있어요.</small>
    </form> : <>
      {mode === "link" && <p className="auth-help">이 계정에 연결할 수단을 선택해 주세요. 다음 로그인부터 사용할 수 있어요.</p>}
      {enabled.map(provider => <button key={provider} type="button" className={"easy-provider easy-" + provider}
        disabled={busy || connected.includes(provider) || !flags?.[provider]} onClick={() => void start(provider)}>
        <span className="easy-mark"><ProviderMark provider={provider} /></span>
        {provider === "pass" ? "PASS 등 휴대폰 본인인증" : easyLabels[provider] + " 로그인"}
        {mode === "link" && (connected.includes(provider) ? " 연결됨" : " 연결")}
        {connected.includes(provider) ? <Check size={16} aria-hidden="true"/> : <ArrowRight size={16} aria-hidden="true"/>}
      </button>)}
      {busy ? <p className="easy-status" role="status">인증 결과를 확인하고 있어요…</p>
        : statusError ? <p className="easy-status" role="status">간편로그인 연결 상태를 확인할 수 없어요. <button type="button" onClick={() => setRefresh(value => value + 1)}>다시 확인</button></p>
        : !flags ? <p className="easy-status" role="status">사용할 수 있는 간편로그인을 확인하고 있어요…</p>
        : missing.length > 0 ? <p className="easy-status">{missing.join(" · ")} 로그인은 준비 중이에요.</p> : null}
    </>}
  </div>;
}
