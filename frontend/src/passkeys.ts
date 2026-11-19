import {
  browserSupportsWebAuthn, startAuthentication, startRegistration, WebAuthnAbortService,
  type PublicKeyCredentialCreationOptionsJSON, type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type { ApiRequest, IdentityProof } from "./portone";

export type SignupAccount = {
  displayName: string;
  email: string;
  username: string;
  identityVerification?: IdentityProof;
};

export const passkeySupported = () => window.isSecureContext && browserSupportsWebAuthn();
export const cancelPasskeyPrompt = () => WebAuthnAbortService.cancelCeremony();

export async function verifyAccountPasskey<T>(request: ApiRequest, signal: AbortSignal, account?: SignupAccount): Promise<T> {
  const action = account ? "register" : "login";
  const path = "/api/auth/passkeys/" + action;
  const post = <R>(step: string, payload: unknown) => request<R>(path + "/" + step, null, {
    method: "POST", signal, body: JSON.stringify(payload),
  });
  if (account) {
    const { ceremonyId, options } = await post<{ceremonyId: string; options: PublicKeyCredentialCreationOptionsJSON}>("options", account);
    signal.throwIfAborted();
    const response = await startRegistration({ optionsJSON: options });
    return post<T>("verify", { ceremonyId, response, account });
  }
  const { ceremonyId, options } = await post<{ceremonyId: string; options: PublicKeyCredentialRequestOptionsJSON}>("options", {});
  signal.throwIfAborted();
  const response = await startAuthentication({ optionsJSON: options });
  return post<T>("verify", { ceremonyId, response });
}

export function passkeyError(error: unknown) {
  switch (error instanceof Error ? error.name : "") {
    case "NotAllowedError":
    case "AbortError": return "기기 인증이 완료되지 않았어요. 인증창을 다시 열어주세요.";
    case "InvalidStateError": return "이 기기에 패스키가 이미 있어요. 패스키 로그인을 시도해 주세요.";
    case "SecurityError": return "이 주소에서는 패스키를 사용할 수 없어요. 크리에이터 유니버스의 공식 사이트에서 다시 시도해 주세요.";
    case "NotSupportedError": return "이 기기는 요청한 인증 방식을 지원하지 않아요. 패스키를 지원하는 브라우저나 보안 키로 시도해 주세요.";
    default: return error instanceof Error ? error.message : "패스키를 확인하지 못했어요. 다시 시도해 주세요.";
  }
}
