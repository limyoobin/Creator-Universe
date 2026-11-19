import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Coins, CreditCard, LogIn, Search, ShieldCheck, UserPlus, Wallet, X } from "lucide-react";
import { getFriendlyError, request } from "./api";
import { PreviousTopUp } from "./PreviousTopUp";
import { cancelPasskeyPrompt, passkeyError, passkeySupported, verifyAccountPasskey } from "./passkeys";
import "./easy-login.css";

export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "CREATOR" | "READER" | "ADMIN";
};

const coinProducts = [
  { id: "coin-1000", title: "베이직 충전", coins: 1000, priceKrw: 1000, badge: "가볍게 시작" },
  { id: "coin-3000", title: "인기 충전팩", coins: 3000, priceKrw: 3000, badge: "인기" },
  { id: "coin-5000", title: "스튜디오 후원팩", coins: 5000, priceKrw: 5000, badge: "창작자 추천" },
];

export function formatCoins(value = 0) {
  return `${Number(value).toLocaleString("ko-KR")} 코인`;
}

function formatWon(value = 0) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

export function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function isStrongPassword(password: string) {
  return password.length >= 8 && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
}

export type AuthView = "login" | "signup" | "recovery";
export function AuthModal({ mode, onClose, onAuth }: {
  mode: AuthView;
  onClose: () => void;
  onAuth: (user: User, token: string) => void;
}) {
  const [view, setView] = useState(mode);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    setMessage("");
    setBusy(false);
    return () => {
      active.current?.abort();
      active.current = null;
      cancelPasskeyPrompt();
    };
  }, [view]);

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setMessage("");
    try { await action(controller.signal); }
    catch (error) { if (!controller.signal.aborted) setMessage(getFriendlyError(error)); }
    finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  }
  type Session = {user: User; token: string};
  function signedIn(result: Session, signal: AbortSignal) {
    if (signal.aborted) return;
    onAuth(result.user, result.token);
  }
  async function legacyPasskey(signal: AbortSignal) {
    try { signedIn(await verifyAccountPasskey<Session>(request, signal), signal); }
    catch (error) { throw new Error(passkeyError(error)); }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const email = String(form.get("email") ?? "").trim();
    const displayName = String(form.get("displayName") ?? "").trim();
    if (view === "signup" && !isStrongPassword(password)) {
      setMessage("비밀번호에 특수문자를 포함해 8자 이상 입력해 주세요."); return;
    }
    if (view === "signup" && password !== form.get("passwordConfirm")) {
      setMessage("비밀번호 확인이 일치하지 않습니다."); return;
    }
    void run(async signal => {
      if (view === "recovery") {
        const result = await request<{username: string}>("/api/auth/find-id", null, {method: "POST", signal, body: JSON.stringify({email})});
        if (!signal.aborted) setMessage("가입한 아이디는 " + result.username + "입니다.");
        return;
      }
      const payload = view === "signup" ? {username, password, email, displayName} : {username, password};
      const result = await request<Session>("/api/auth/" + view, null, {method: "POST", signal, body: JSON.stringify(payload)});
      signedIn(result, signal);
    });
  }

  return <div className="modal-backdrop auth-backdrop cu-auth-backdrop" role="dialog" aria-modal="true" aria-labelledby="cu-auth-heading">
    <div className="auth-modal cu-auth-modal">
      <div className="modal-header">
        <h2 id="cu-auth-heading">{view === "login" ? "로그인" : view === "signup" ? "회원가입" : "계정 찾기"}</h2>
        <button className="icon-button" type="button" onClick={onClose} aria-label="닫기"><X size={20}/></button>
      </div>
      <div className="segmented">
        <button className={view === "login" ? "active" : ""} onClick={() => setView("login")}>로그인</button>
        <button className={view === "signup" ? "active" : ""} onClick={() => setView("signup")}>회원가입</button>
        <button className={view === "recovery" ? "active" : ""} onClick={() => setView("recovery")}>계정 찾기</button>
      </div>
      {message && <div className="notice" role="status">{message}</div>}
      <form key={view} className="auth-form" onSubmit={submit}>
        {view === "signup" && <>
          <p className="auth-help">하나의 계정으로 작품을 감상하고 창작자 스튜디오를 이용할 수 있어요.</p>
          <label>닉네임<input name="displayName" autoComplete="nickname" required maxLength={20} placeholder="공개 프로필에 사용할 이름" /></label>
        </>}
        {view !== "login" && <label>가입 이메일<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
        {view !== "recovery" && <>
          <label>아이디<input name="username" autoComplete="username" required
            minLength={view === "signup" ? 2 : undefined} maxLength={view === "signup" ? 24 : undefined}
            pattern={view === "signup" ? "[A-Za-z0-9_]+" : undefined} placeholder={view === "signup" ? "영문, 숫자, 밑줄 2~24자" : "가입한 아이디"} /></label>
          <label>비밀번호<input name="password" type="password" autoComplete={view === "signup" ? "new-password" : "current-password"}
            required minLength={view === "signup" ? 8 : undefined} maxLength={view === "signup" ? 256 : undefined}
            placeholder={view === "signup" ? "8자 이상, 특수문자 1개 이상" : "비밀번호"} /></label>
        </>}
        {view === "signup" && <label>비밀번호 확인<input name="passwordConfirm" type="password" autoComplete="new-password" required /></label>}
        <button className="primary-button" type="submit" disabled={busy}>
          {view === "signup" ? <UserPlus size={18}/> : view === "login" ? <LogIn size={18}/> : <Search size={18}/>}
          {busy ? "확인 중…" : view === "signup" ? "회원가입" : view === "login" ? "로그인" : "아이디 찾기"}
        </button>
      </form>
      {view === "login" && <details className="auth-other-methods">
        <summary>이전에 패스키로 가입하셨나요?</summary>
        {passkeySupported()
          ? <button className="ghost-button" type="button" disabled={busy} onClick={() => void run(legacyPasskey)}><ShieldCheck size={18} />기존 패스키로 로그인</button>
          : <p className="auth-help">가입할 때 사용한 패스키를 지원하는 기기나 브라우저에서 열어주세요.</p>}
      </details>}
      {view === "recovery" && <p className="auth-help">비밀번호 재설정은 가입한 이메일로 고객센터에 문의해 주세요. <a href="mailto:support@creator-universe.app">support@creator-universe.app</a></p>}
    </div>
  </div>;
}

export function PaymentModal({
  mode,
  project,
  work,
  wallet,
  onClose,
  onConfirm,
  onLogin,
  isLoggedIn, token, userId, onBalance, salePrice, returnId,
}: {
  mode: "charge" | "content";
  project: { title: string; synopsis?: string; appliedFeeRate: number } | null;
  work: { title: string; tagline: string } | null;
  wallet: number | null;
  onClose: () => void;
  onConfirm: (coinAmount: number) => Promise<void>;
  token: string | null; userId?: string;
  onBalance: (balance: number) => void;
  salePrice: number | undefined;
  returnId?: string | null;
  onLogin: () => void;
  isLoggedIn: boolean;
}) {
  const [selectedProductId, setSelectedProductId] = useState("coin-1000");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const selectedProduct = coinProducts.find((item) => item.id === selectedProductId) || coinProducts[0];
  const isChargeMode = mode === "charge";
  const [previewed, setPreviewed] = useState(false);
  const contentPrice = salePrice ?? 0;
  const purchasing = useRef(false);
  const feeRate = project?.appliedFeeRate ?? 0.13;
  const estimatedCreatorShare = Math.floor(contentPrice * (1 - feeRate));
  const hasEnoughCoins = wallet !== null && wallet >= contentPrice;
  const finalPaymentLabel = isChargeMode ? formatWon(0) : formatCoins(contentPrice);
  const currentWallet = wallet ?? 0;
  const expectedWalletAfterPayment = Math.max(0, currentWallet - contentPrice);

  async function submitPayment() {
    setPaymentMessage("");
    if (!isLoggedIn) {
      onLogin();
      return;
    }

    if (purchasing.current || salePrice === undefined || !hasEnoughCoins) return;
    purchasing.current = true; setIsPaying(true);
    try {
      await onConfirm(contentPrice);
      onClose();
    } catch (error) {
      setPaymentMessage(getFriendlyError(error));
    } finally {
      purchasing.current = false; setIsPaying(false);
    }
  }

  return (
    <div className="modal-backdrop payment-backdrop" role="dialog" aria-modal="true">
      <div className="payment-modal">
        <div className="modal-header">
          <div>
            <h2>{isChargeMode ? "코인 충전 체험" : "콘텐츠 결제"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="결제창 닫기">
            <X size={19} />
          </button>
        </div>

        <div className="payment-hero">
          <div>
            <span className="payment-label">{isChargeMode ? "무료 체험" : "콘텐츠 열람권"}</span>
            <strong>{isChargeMode ? "체험할 코인을 선택하세요" : work?.title || project?.title || "미드나잇 시그널"}</strong>
            <p>{isChargeMode ? "이 화면에서만 충전 결과를 미리 볼 수 있어요. 지갑 잔액은 그대로예요." : work?.tagline || project?.synopsis || "작품 정보를 불러오는 중입니다."}</p>
          </div>
          <div className="coin-orb">
            <Coins size={34} />
            <b>{isChargeMode ? formatCoins(selectedProduct.coins) : formatCoins(contentPrice)}</b>
          </div>
        </div>

        {isChargeMode ? (
          <div className="coin-products" aria-label="코인 상품 선택">
            {coinProducts.map((item) => (
              <button
                key={item.id}
                className={selectedProductId === item.id ? "active" : ""}
                aria-pressed={selectedProductId === item.id}
                onClick={() => { setSelectedProductId(item.id); setPreviewed(false); }}
                type="button"
              >
                <span>{item.badge}</span>
                <strong>{item.title}</strong>
                <b>{formatCoins(item.coins)}</b>
                <small>{formatWon(item.priceKrw)}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="payment-content-ticket">
            <span>열람권 구매</span>
            <strong>{formatCoins(contentPrice)}</strong>
            <p>{hasEnoughCoins ? "보유 코인에서 차감됩니다." : !isLoggedIn ? "로그인하면 보유 코인을 확인할 수 있어요." : "이 열람권을 구매하기에 보유 코인이 부족해요. 현재 신규 유료 충전은 중단되어 있어요."}</p>
          </div>
        )}

        {!isChargeMode && <div className="payment-grid">
          <div className="payment-method-card">
            <CreditCard size={20} />
            <div>
              <strong>코인 결제</strong>
              <p>보유 코인으로 작품 열람권을 구매합니다.</p>
            </div>
            <CheckCircle2 size={20} />
          </div>
          <div className="payment-method-card">
            <ShieldCheck size={20} />
            <div>
              <strong>스마트 자동 정산</strong>
              <p>{`결제 후 수수료 ${Math.round(feeRate * 100)}%를 제외한 ${formatCoins(estimatedCreatorShare)}이 팀 지분율대로 분배됩니다.`}</p>
            </div>
          </div>
        </div>}

        <div className="payment-summary">
          <div><span>선택 상품</span><b>{isChargeMode ? selectedProduct.title : work?.title || project?.title}</b></div>
          {!isChargeMode && <div><span>내 지갑</span><b>{isLoggedIn ? formatCoins(currentWallet) : "로그인 필요"}</b></div>}
          <div><span>{isChargeMode ? "체험 코인" : "사용 코인"}</span><b>{isChargeMode ? formatCoins(selectedProduct.coins) : formatCoins(contentPrice)}</b></div>
          <div className="total"><span>{isChargeMode ? "실제 청구액" : "최종 결제"}</span><b>{finalPaymentLabel}</b></div>
        </div>

        {paymentMessage && <p className="payment-error-message">{paymentMessage}</p>}

        {isLoggedIn && !isChargeMode && hasEnoughCoins && (
          <div className="payment-balance-preview">
            <div>
              <span>현재 보유</span>
              <strong>{formatCoins(currentWallet)}</strong>
            </div>
            <i>-</i>
            <div>
              <span>결제 후 보유</span>
              <strong>{formatCoins(expectedWalletAfterPayment)}</strong>
            </div>
          </div>
        )}

        {isChargeMode ? <>
          {previewed && <p className="notice" role="status">{formatCoins(selectedProduct.coins)} 충전을 체험했어요. 청구액은 0원입니다.</p>}
          <button type="button" className="primary-button payment-submit" onClick={() => previewed ? onClose() : setPreviewed(true)}>
            {previewed ? <CheckCircle2 size={18} /> : <Coins size={18} />}{previewed ? "완료" : "충전 체험하기"}
          </button>
          <PreviousTopUp key={userId ?? "guest"} token={token} userId={userId}
            request={request} returnId={returnId}
            onLogin={onLogin} onBalance={onBalance} />
        </> : <button className="primary-button payment-submit" onClick={submitPayment} disabled={isPaying || salePrice === undefined || (isLoggedIn && !hasEnoughCoins)}>
          <Wallet size={18} />{salePrice === undefined ? "판매 준비 중" : !isLoggedIn ? "로그인하고 결제하기" : isPaying ? "결제 처리 중…" :
            hasEnoughCoins ? `${formatCoins(contentPrice)}으로 열람하기` : "보유 코인 부족"}
        </button>}
      </div>
    </div>
  );
}

type LibraryEpisode = {
  id: string;
  title: string;
  sequenceNumber: number;
  audioUrl: string;
  transcriptCues: { text: string; startMs: number; endMs: number }[];
};

export function PurchasedAudio({ workId, token }: { workId: string; token: string }) {
  const [episodes, setEpisodes] = useState<LibraryEpisode[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [playbackError, setPlaybackError] = useState(false);
  const selected = episodes?.find(item => item.id === selectedId) ?? episodes?.[0];
  useEffect(() => {
    const controller = new AbortController();
    setEpisodes(null);
    setError("");
    setPlaybackError(false);
    request<{ episodes: LibraryEpisode[] }>(
      `/api/settlements/me/library/${encodeURIComponent(workId)}/episodes`, token, { signal: controller.signal },
    ).then(result => {
      if (!controller.signal.aborted) setEpisodes(result.episodes);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(getFriendlyError(reason));
    });
    return () => controller.abort();
  }, [workId, token, attempt]);

  return <section className="work-detail-section purchased-audio" aria-label="구매한 오디오 회차">
    <h3>구매한 오디오 회차</h3>
    {error ? <div role="status"><p>{error}</p><button type="button" className="ghost-button" onClick={() => setAttempt(value => value + 1)}>회차 다시 불러오기</button></div>
      : !episodes ? <p role="status">회차를 불러오는 중입니다.</p>
      : !selected ? <p role="status">현재 재생할 수 있는 유료 회차가 없습니다.</p>
      : <>
        <label>감상할 회차
          <select value={selected.id} onChange={event => { setSelectedId(event.target.value); setPlaybackError(false); }}>
            {episodes.map(item => <option key={item.id} value={item.id}>{item.sequenceNumber}화 · {item.title}</option>)}
          </select>
        </label>
        <audio key={selected.id} controls preload="none" src={selected.audioUrl}
          aria-label={`${selected.sequenceNumber}화 ${selected.title} 재생`} onError={() => setPlaybackError(true)} />
        {playbackError && <div role="status"><p>오디오를 재생할 수 없습니다.</p><button className="ghost-button" type="button" onClick={() => setAttempt(value => value + 1)}>오디오 다시 불러오기</button></div>}
        {selected.transcriptCues.length > 0 ? <details key={selected.id}><summary>회차 대본 읽기</summary>
          <ol>{selected.transcriptCues.map((cue, index) => <li key={index}><span>{formatDuration(cue.startMs / 1000)}</span> {cue.text}</li>)}</ol>
        </details> : <p>이 회차에 등록된 대본이 없습니다.</p>}
      </>}
  </section>;
}
