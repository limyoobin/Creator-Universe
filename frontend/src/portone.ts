import { useEffect, useState } from "react";

export type ApiRequest = <T>(path: string, token: string | null, options?: RequestInit) => Promise<T>;
export type IntegrationStatus = {
  mode: "test" | "live";
  identityReady: boolean;
  identityRequired: boolean;
  paymentReady: boolean;
};

export function useIntegrationStatus(request: ApiRequest, enabled: boolean) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setFailed(false);
    setStatus(null);
    request<IntegrationStatus>("/api/integrations/portone", null, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setStatus(result); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [request, enabled, attempt]);
  return { status, failed, retry: () => setAttempt(value => value + 1) };
}

export type IdentityProof = { identityVerificationId: string; proof: string };
export type Challenge = IdentityProof & { storeId: string; channelKey: string; expiresAt: string };
export type PaymentOrder = {
  storeId: string; channelKey: string; paymentId: string; orderName: string; totalAmount: number;
  payMethod: "CARD"; currency: "KRW"; customer: { customerId: string }; test: boolean;
};
type SDKResult = { code?: string; message?: string; paymentId?: string; identityVerificationId?: string };
type PortOneSDK = {
  requestPayment(input: Omit<PaymentOrder, "test" | "currency"> & { currency: "CURRENCY_KRW"; redirectUrl: string }): Promise<SDKResult | undefined>;
  requestIdentityVerification(input: Pick<Challenge, "storeId" | "channelKey" | "identityVerificationId"> & { redirectUrl: string; bypass: {inicisUnified: {flgFixedUser: "N"}} }): Promise<SDKResult | undefined>;
};
declare global { interface Window { PortOne?: PortOneSDK } }
let loadingSDK: Promise<PortOneSDK> | null = null;

export function loadPortOne() {
  if (window.PortOne) return Promise.resolve(window.PortOne);
  if (!loadingSDK) loadingSDK = new Promise<PortOneSDK>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      loadingSDK = null;
      reject(new Error("인증·결제창에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."));
    };
    const timer = window.setTimeout(fail, 15000);
    script.src = "https://cdn.portone.io/v2/browser-sdk.js";
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.PortOne) resolve(window.PortOne);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loadingSDK;
}

type Flow = "identity" | "payment";
export function returnUrl(flow: Flow) {
  const url = new URL(window.location.pathname, window.location.origin);
  const query = new URLSearchParams(window.location.search);
  for (const key of ["studio", "view", "app", "shell"]) {
    const value = query.get(key);
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("cuReturn", flow);
  return url.href;
}

export function readProviderReturn() {
  const params = new URLSearchParams(window.location.search);
  const flow = params.get("cuReturn");
  if (flow !== "payment" && flow !== "identity") return null;
  return { flow, id: params.get(flow === "payment" ? "paymentId" : "identityVerificationId"), error: params.has("code") };
}

export function clearProviderReturn() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("cuReturn")) return;
  for (const key of ["cuReturn", "paymentId", "identityVerificationId", "txId", "identityVerificationTxId", "transactionType", "code", "message", "pgCode", "pgMessage"]) url.searchParams.delete(key);
  window.history.replaceState(null, "", url);
}

export function post<T>(request: ApiRequest, path: string, token: string | null, body: unknown) {
  return request<T>(path, token, { method: "POST", body: JSON.stringify(body) });
}

const identityKey = "creator-universe-signup-verification";
export function readChallenge(): Challenge | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(identityKey) || "null");
    return data && typeof data.proof === "string" && typeof data.identityVerificationId === "string" && Date.parse(data.expiresAt) > Date.now() ? data : null;
  } catch { return null; }
}
export function saveChallenge(challenge: Challenge | null) {
  if (challenge) sessionStorage.setItem(identityKey, JSON.stringify(challenge));
  else sessionStorage.removeItem(identityKey);
}
