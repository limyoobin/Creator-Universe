import { hashToken } from "../utils/auth.js";

export const kakaoAdminKey = () => process.env.KAKAO_ADMIN_KEY?.trim() || "";
export const kakaoSubject = (id: string) => hashToken(JSON.stringify(["kakao", process.env.KAKAO_REST_API_KEY?.trim(), id]));

// Kakao's numeric user_id is a Long. Current Node preserves the original JSON token
// through the reviver context. Older runtimes may only accept exactly representable IDs.
export function kakaoJson(text: string): {id?: string; code?: number} {
  return JSON.parse(text, (key: string, value: unknown, context?: {source?: string}) => {
    if (key !== "id" || typeof value !== "number") return value;
    const digits = context?.source ?? (Number.isSafeInteger(value) ? String(value) : "");
    return /^[1-9]\d{0,18}$/.test(digits) ? digits : null;
  });
}

export async function revokeKakao(id: string) {
  const response = await fetch("https://kapi.kakao.com/v1/user/unlink", {
    method: "POST", headers: {Authorization: "KakaoAK " + kakaoAdminKey()},
    body: new URLSearchParams({target_id_type: "user_id", target_id: id}), redirect: "error", signal: AbortSignal.timeout(3500),
  });
  const result = kakaoJson(await response.text());
  // KAPI -101 means this user is already unlinked from the app.
  return response.ok ? result.id === id : response.status === 400 && result.code === -101;
}
