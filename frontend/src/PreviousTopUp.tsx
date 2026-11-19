import { useEffect, useRef, useState } from "react";
import { post, type ApiRequest } from "./portone";

type Receipt = {
  status: "PAID" | "PARTIAL_CANCELLED" | "CANCELLED" | "FAILED" | "READY" | "PENDING" | "NOT_FOUND";
  walletBalance: number; creditedCoins: number; test: boolean;
};
type Props = {
  request: ApiRequest; token: string | null; userId?: string; returnId?: string | null;
  onLogin: () => void; onBalance: (balance: number) => void;
};
const storageKey = (userId: string) => "creator-universe-checkout:" + userId;
const validId = (value: unknown): value is string => typeof value === "string" && /^cu-[a-f0-9]{32}$/.test(value);
function savedId(userId?: string) {
  try {
    const id = userId && JSON.parse(localStorage.getItem(storageKey(userId)) || "null")?.paymentId;
    return validId(id) ? id : null;
  } catch { return null; }
}

/** Reconcile an order placed before card checkout was retired. */
export function PreviousTopUp({request, token, userId, returnId, onBalance, onLogin}: Props) {
  const [paymentId, setPaymentId] = useState(() => validId(returnId) ? returnId : savedId(userId));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [unapproved, setUnapproved] = useState(false);
  const active = useRef(false);
  const checked = useRef(false);
  const current = useRef(true);
  useEffect(() => {
    current.current = true;
    return () => { current.current = false; };
  }, []);

  function forget() {
    if (userId && savedId(userId) === paymentId) localStorage.removeItem(storageKey(userId));
    setPaymentId(null);
    setUnapproved(false);
  }
  async function confirm() {
    if (!token || !userId || !paymentId || active.current) return;
    active.current = true;
    setBusy(true);
    try {
      const result = await post<Receipt>(request, "/api/users/me/wallet/orders/" + paymentId + "/confirm", token, {});
      if (!current.current) return;
      setUnapproved(false);
      if (result.status === "PENDING") { setMessage("승인 결과를 기다리고 있어요. 잠시 후 다시 확인해 주세요."); return; }
      if (result.status === "READY" || result.status === "NOT_FOUND") {
        setUnapproved(true);
        setMessage("아직 승인된 내역이 없어요. 이미 결제했다면 잠시 후 다시 확인해 주세요.");
        return;
      }
      forget();
      onBalance(result.walletBalance);
      const labels: Record<Exclude<Receipt["status"], "PENDING" | "READY" | "NOT_FOUND">, string> = {
        PAID: result.test ? "이전 테스트 주문이 확인됐어요." : result.creditedCoins.toLocaleString("ko-KR") + "코인 충전 내역을 확인했어요.",
        PARTIAL_CANCELLED: "이전 주문의 부분 취소 금액을 지갑에 반영했어요.",
        CANCELLED: "취소된 주문이에요.", FAILED: "승인에 실패한 주문이에요.",
      };
      setMessage(labels[result.status]);
    } catch {
      if (current.current) setMessage("이전 주문을 확인할 수 없어요. 결제한 계정으로 로그인했는지 확인해 주세요.");
    } finally {
      active.current = false;
      if (current.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (returnId === undefined || !paymentId || !token || !userId || checked.current) return;
    checked.current = true;
    void confirm();
  }, [returnId, paymentId, token, userId]);

  if (returnId !== undefined && (!userId || !token)) return <button className="ghost-button" onClick={onLogin}>로그인하고 이전 결제 내역 확인</button>;
  if (!paymentId && !message) return null;
  return <div className="cu-checkout-actions">
    {message && <p role="status" className="notice">{message}</p>}
    {paymentId && <button type="button" className="ghost-button" disabled={busy} onClick={() => void confirm()}>{busy ? "주문 확인 중…" : "이전 결제 내역 확인"}</button>}
    {unapproved && <button type="button" className="ghost-button" disabled={busy} onClick={() => { forget(); setMessage(""); }}>목록에서 숨기기</button>}
  </div>;
}
