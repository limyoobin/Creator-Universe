import { useEffect, useRef, useState } from "react";
import { CreditCard } from "lucide-react";
import { loadPortOne, post, returnUrl, type ApiRequest, type PaymentOrder, type IntegrationStatus } from "./portone";

type Receipt = {
  status: "PAID" | "PARTIAL_CANCELLED" | "CANCELLED" | "FAILED" | "READY" | "PENDING" | "NOT_FOUND";
  walletBalance: number; creditedCoins: number; test: boolean;
};
type Props = {
  token: string | null; userId?: string; request: ApiRequest;
  status: IntegrationStatus | null; product: {id: string; priceKrw: number};
  onBalance: (balance: number) => void; onLogin: () => void;
  returned: {id: string | null; error: boolean} | null;
};
const orderKey = (userId: string) => "creator-universe-checkout:" + userId;
function remembered(userId?: string): PaymentOrder | null {
  if (!userId) return null;
  try {
    const order = JSON.parse(localStorage.getItem(orderKey(userId)) || "null");
    return order && typeof order.paymentId === "string" && typeof order.totalAmount === "number" ? order : null;
  } catch { return null; }
}

export function CoinCheckout({ request, status, product, userId, token, onLogin, onBalance, returned }: Props) {
  const [pending, setPending] = useState(() => remembered(userId));
  const [canResume, setCanResume] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const checkedReturn = useRef(false);
  const balanceCallback = useRef(onBalance);
  balanceCallback.current = onBalance;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function forget(order: PaymentOrder) {
    if (userId && remembered(userId)?.paymentId === order.paymentId) localStorage.removeItem(orderKey(userId));
    setPending(null);
  }

  async function reconcile(order: PaymentOrder) {
    const result = await post<Receipt>(request, "/api/users/me/wallet/orders/" + encodeURIComponent(order.paymentId) + "/confirm", token, {});
    if (result.status === "PENDING") { setMessage("승인 결과를 기다리고 있어요. 잠시 후 같은 주문의 결과를 확인해 주세요."); return; }
    if (result.status === "NOT_FOUND" || result.status === "READY") {
      setCanResume(true);
      setMessage("아직 승인된 결제가 없어요. 같은 주문의 결제창을 다시 열 수 있습니다.");
      return;
    }
    forget(order);
    if (mounted.current) balanceCallback.current(result.walletBalance);
    if (result.status === "PAID") {
      setReceipt(true);
      setMessage(result.test ? "테스트 결제가 확인됐어요. 사용 가능한 코인은 지급되지 않습니다." : result.creditedCoins.toLocaleString("ko-KR") + "코인 충전이 완료됐어요.");
    } else if (result.status === "PARTIAL_CANCELLED") {
      setMessage("부분 취소된 주문입니다. 지갑에서 반영된 금액을 확인해 주세요.");
    } else setMessage(result.status === "FAILED" ? "결제가 승인되지 않았어요." : "결제가 취소됐어요.");
  }

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setCanResume(false);
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "결과를 확인하지 못했어요. 다시 확인해 주세요."); }
    finally { lock.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (!returned || !userId || !token || checkedReturn.current) return;
    checkedReturn.current = true;
    const saved = remembered(userId);
    if (!saved || (returned.id && saved.paymentId !== returned.id)) {
      setMessage("현재 계정에서 돌아온 주문을 찾지 못했어요. 결제한 계정의 지갑 내역을 확인해 주세요.");
      return;
    }
    void run(() => reconcile(saved));
  }, [returned, userId, token]);

  async function openCheckout(order?: PaymentOrder) {
    if (!token || !userId) { onLogin(); return; }
    const sdk = await loadPortOne();
    const next = order ?? await post<PaymentOrder>(request, "/api/users/me/wallet/orders", token, { productId: product.id });
    if ((!order && next.totalAmount !== product.priceKrw) || next.currency !== "KRW" || next.test !== (status?.mode === "test")) throw new Error("상품 가격이나 결제 채널이 변경되었습니다. 결제창을 닫고 다시 확인해 주세요.");
    localStorage.setItem(orderKey(userId), JSON.stringify(next)); setPending(next);
    const { paymentId, orderName, totalAmount, storeId, channelKey, payMethod, customer } = next;
    const response = await sdk.requestPayment({ storeId, channelKey, paymentId, orderName, totalAmount, currency: "CURRENCY_KRW", payMethod, customer, redirectUrl: returnUrl("payment") });
    if (response?.paymentId && response.paymentId !== paymentId) throw new Error("주문 번호가 일치하지 않습니다. 주문 결과를 다시 확인해 주세요.");
    await reconcile(next);
  }

  const pendingAmount = pending?.totalAmount.toLocaleString("ko-KR") + "원";
  return <div className="cu-checkout-actions">
    {status?.mode === "test" && status.paymentReady && <p className="notice">테스트 결제입니다. 실제 지갑 잔액에는 반영되지 않습니다.</p>}
    {pending && <p>확인할 주문 · {pendingAmount} <small>{pending.orderName}</small></p>}
    {message && <p className="notice" role="status">{message}</p>}
    {receipt ? <button type="button" className="ghost-button" onClick={() => { setReceipt(false); setMessage(""); }}>다른 금액 충전하기</button>
      : <button type="button" className="primary-button payment-submit" disabled={busy || (!pending && !status?.paymentReady)}
          onClick={() => !userId || !token ? onLogin() : void run(() => {
            const existing = remembered(userId);
            if (existing) { setPending(existing); return reconcile(existing); }
            return openCheckout();
          })}>
          <CreditCard size={18} />{busy ? "결제 확인 중…" : pending ? "이 주문 결과 확인" : !status ? "결제 연결 확인 중" :
            !status.paymentReady ? "카드 결제 준비 중" : !token || !userId ? "로그인하고 결제하기" :
              (status.mode === "test" ? "테스트 결제 " : "카드 결제 ") + product.priceKrw.toLocaleString("ko-KR") + "원"}
        </button>}
    {pending && canResume && <div>
      <button type="button" className="ghost-button" disabled={busy || !status?.paymentReady} onClick={() => void run(() => openCheckout(pending))}>{pendingAmount} 결제창 다시 열기</button>
      <button type="button" className="ghost-button" disabled={busy} onClick={() => { forget(pending); setCanResume(false); setMessage(""); }}>상품 다시 선택</button>
    </div>}
  </div>;
}
