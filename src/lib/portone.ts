import { AppError } from "../errors/app-error.js";

const setting = (name: string) => process.env[name]?.trim() || "";

export function portOneConfig() {
  return {
    storeId: setting("PORTONE_STORE_ID"),
    paymentChannelKey: setting("PORTONE_PAYMENT_CHANNEL_KEY"),
    identityChannelKey: setting("PORTONE_IDENTITY_CHANNEL_KEY"),
    apiSecret: setting("PORTONE_API_SECRET"),
    live: setting("PORTONE_MODE") === "live",
  };
}

function configured() {
  const { storeId, apiSecret } = portOneConfig();
  return Boolean(storeId && apiSecret && ["test", "live"].includes(setting("PORTONE_MODE")));
}

export const paymentReady = () => configured() && Boolean(setting("PORTONE_PAYMENT_CHANNEL_KEY") && setting("PORTONE_WEBHOOK_SECRET"));
export const identityReady = () => configured() && Boolean(setting("PORTONE_IDENTITY_CHANNEL_KEY"));
export const identityRequired = () => setting("PORTONE_IDENTITY_REQUIRED") === "true";

export async function portOneGet<T>(path: string): Promise<T> {
  if (!configured()) throw new AppError("포트원 서비스 연결을 준비하고 있습니다.", 503);
  const { storeId, apiSecret } = portOneConfig();
  const url = new URL(path, "https://api.portone.io");
  if (url.origin !== "https://api.portone.io") throw new Error("Invalid PortOne endpoint");
  url.searchParams.set("storeId", storeId);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `PortOne ${apiSecret}`, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) throw new AppError("포트원에 등록된 처리 내역을 찾지 못했습니다.", 404);
    if (!response.ok) throw new AppError("포트원에서 처리 내역을 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.", 502);
    return await response.json() as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("포트원 응답을 확인할 수 없습니다. 잠시 후 다시 확인해 주세요.", 503);
  }
}
