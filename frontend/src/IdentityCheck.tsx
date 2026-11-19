import { useEffect, useRef, useState } from "react";
import { type ApiRequest, type Challenge, type IdentityProof, type IntegrationStatus, loadPortOne, post, readChallenge, returnUrl, saveChallenge } from "./portone";

type Props = {
  request: ApiRequest;
  status: IntegrationStatus | null;
  onVerified: (proof: IdentityProof | null) => void;
  returned: { id: string | null; error: boolean } | null;
};

export function IdentityCheck({ request, status, onVerified, returned }: Props) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const active = useRef(false);
  const [challenge, setChallenge] = useState(readChallenge);

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setTimeout(() => {
      saveChallenge(null); setChallenge(null); setVerified(false); onVerified(null);
      setMessage("인증 시간이 만료됐어요. 다시 인증해 주세요.");
    }, Math.max(0, Date.parse(challenge.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [challenge, onVerified]);

  useEffect(() => {
    let current = true;
    const saved = readChallenge();
    if (returned?.error || (returned?.id && returned.id !== saved?.identityVerificationId)) {
      setMessage("인증 결과를 연결할 수 없어요. 본인인증을 다시 진행해 주세요.");
      return;
    }
    if (!saved || !status?.identityReady) return;
    post<{ verified: boolean }>(request, "/api/auth/identity/confirm", null, { identityVerificationId: saved.identityVerificationId, proof: saved.proof })
      .then(result => {
        if (!current || !result.verified || readChallenge()?.identityVerificationId !== saved.identityVerificationId) return;
        onVerified({ identityVerificationId: saved.identityVerificationId, proof: saved.proof });
        setVerified(true);
      })
      .catch(() => { if (current) setMessage("이전 인증이 확인되지 않았어요. 다시 인증해 주세요."); });
    return () => { current = false; };
  }, [onVerified, request, status, returned]);

  async function verify() {
    if (active.current || !status?.identityReady) return;
    active.current = true; setBusy(true); setVerified(false); onVerified(null); setMessage("");
    try {
      const sdk = await loadPortOne();
      const next = await post<Challenge>(request, "/api/auth/identity/start", null, {});
      saveChallenge(next); setChallenge(next);
      const { storeId, channelKey, identityVerificationId, proof } = next;
      const result = await sdk.requestIdentityVerification({ storeId, channelKey, identityVerificationId, redirectUrl: returnUrl("identity"), bypass: { inicisUnified: { flgFixedUser: "N" } } });
      if (!result || result.code || result.identityVerificationId !== identityVerificationId) throw new Error("본인인증이 완료되지 않았어요. 다시 시도해 주세요.");
      const confirmed = await post<{verified: boolean}>(request, "/api/auth/identity/confirm", null, { identityVerificationId, proof });
      if (!confirmed.verified || readChallenge()?.identityVerificationId !== identityVerificationId) throw new Error("인증 유효 시간을 확인하고 다시 시도해 주세요.");
      onVerified({ identityVerificationId, proof }); setVerified(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본인인증을 확인하지 못했어요.");
    } finally { active.current = false; setBusy(false); }
  }

  if (!status) return null;
  if (!status.identityReady && !status.identityRequired) return null;
  return <fieldset className="auth-role-selector">
    <legend>실명 본인인증 {status.identityRequired ? "(필수)" : "(선택)"}</legend>
    <p className="auth-help">{!status.identityReady ? "현재 본인인증을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요."
      : status.mode === "test" ? "테스트 채널에서 인증 흐름을 확인합니다." : "인증창에서 본인 명의의 인증 수단을 선택해 주세요."}</p>
    <button type="button" className="ghost-button" disabled={busy || verified || !status.identityReady} onClick={verify}>
      {verified ? "본인인증 확인 완료" : busy ? "인증 결과 확인 중…" : "간편인증 시작"}
    </button>
    {message && <p className="notice" role="status">{message}</p>}
  </fieldset>;
}
