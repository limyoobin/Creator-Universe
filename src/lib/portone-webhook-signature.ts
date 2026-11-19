import { createHmac, timingSafeEqual } from "node:crypto";

// PortOne V2 uses Standard Webhooks (HMAC-SHA256 over the original request bytes).
export function validWebhookSignature(secret: string, id: string, timestamp: string, signature: string, raw: Buffer, now = Date.now()) {
  const seconds = Number(timestamp);
  if (!id || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - seconds) > 300) return false;
  const encodedKey = secret.replace(/^whsec_/, "");
  if (!encodedKey || !/^[a-zA-Z0-9+/]+={0,2}$/.test(encodedKey)) return false;
  const key = Buffer.from(encodedKey, "base64");
  if (!key.length) return false;
  const expected = createHmac("sha256", key).update(id + "." + timestamp + ".").update(raw).digest("base64");
  const expectedBytes = Buffer.from("v1," + expected);
  return signature.split(/\s+/).some(value => {
    const actual = Buffer.from(value);
    return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
  });
}
