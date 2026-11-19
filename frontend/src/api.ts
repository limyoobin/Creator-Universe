const DEFAULT_PRODUCTION_API_URL = "https://creator-universe-api-7qfc.onrender.com";
const DEFAULT_LOCAL_API_URL = "http://127.0.0.1:4000";

function resolveApiUrl() {
  const configuredValue = String(import.meta.env.VITE_API_URL || "").trim();
  const configuredUrl = configuredValue
    .replace(/^VITE_API_URL\s*=\s*/i, "")
    .trim()
    .replace(/\/$/, "");

  if (configuredUrl) {
    try {
      const host = new URL(configuredUrl).hostname;
      const isFrontendDeployment = host.endsWith(".vercel.app") || host.includes("limyoobins-projects");
      if (!isFrontendDeployment) {
        return configuredUrl;
      }
    } catch {
      return import.meta.env.PROD ? DEFAULT_PRODUCTION_API_URL : DEFAULT_LOCAL_API_URL;
    }
  }

  return import.meta.env.PROD ? DEFAULT_PRODUCTION_API_URL : DEFAULT_LOCAL_API_URL;
}

export const API_URL = resolveApiUrl();
export function isBrokenDisplayText(value?: string | null) {
  if (!value) {
    return true;
  }

  const normalized = value.trim();

  return (
    /[�諛援肄踰媛蹂쒓꾩먯좊꾨誘몄젣寃곗愿李梨]/.test(normalized) ||
    /\?{2,}/.test(normalized) ||
    /API \?/.test(normalized) ||
    /^deleted[_\s-]/i.test(normalized) ||
    /^Deleted user/i.test(normalized) ||
    /^\?+[a-z0-9-]{6,}$/i.test(normalized)
  );
}

export function cleanDisplayText(value: string | null | undefined, fallback: string) {
  if (isBrokenDisplayText(value)) {
    return fallback;
  }

  return value!.trim();
}

export async function request<T>(path: string, token: string | null, options: RequestInit = {}) {
  const apiBases = [
    API_URL,
    import.meta.env.PROD && !token && (!options.method || options.method === "GET") && !path.startsWith("/api/integrations/") && !path.startsWith("/api/auth/") && API_URL !== DEFAULT_PRODUCTION_API_URL ? DEFAULT_PRODUCTION_API_URL : "",
  ].filter((baseUrl, index, list) => baseUrl && list.indexOf(baseUrl) === index);
  let lastError = new Error("백엔드 서버에 연결할 수 없습니다. VITE_API_URL 또는 Render 배포 상태를 확인해 주세요.");

  for (const baseUrl of apiBases) {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      lastError = new Error("백엔드 서버에 연결할 수 없습니다. VITE_API_URL 또는 Render 배포 상태를 확인해 주세요.");
      continue;
    }

    const rawText = await response.text();
    let payload: { message?: string; data: T };
    try {
      payload = rawText ? JSON.parse(rawText) : { success: response.ok, data: null as T };
    } catch {
      lastError = new Error("API 응답을 읽을 수 없습니다. 프론트가 백엔드가 아닌 페이지 응답을 받았습니다.");
      continue;
    }

    if (!response.ok) {
      throw new Error(cleanDisplayText(payload.message, "요청 처리에 실패했습니다."));
    }

    return payload.data as T;
  }

  throw lastError;
}

export function getFriendlyError(error: unknown) {
  return error instanceof Error ? cleanDisplayText(error.message, "요청 처리 중 오류가 발생했습니다.") : "요청 처리 중 오류가 발생했습니다.";
}
