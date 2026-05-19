import { toDecimal } from "../utils/decimal.js";

export const STANDARD_PLATFORM_FEE_RATE = 0.12;
export const PARTNER_PLATFORM_FEE_RATE = 0.06;

export const STANDARD_PLATFORM_FEE_DECIMAL = toDecimal(STANDARD_PLATFORM_FEE_RATE);
export const PARTNER_PLATFORM_FEE_DECIMAL = toDecimal(PARTNER_PLATFORM_FEE_RATE);

export function getPlatformFeeRate(isPartner: boolean) {
  return isPartner ? PARTNER_PLATFORM_FEE_DECIMAL : STANDARD_PLATFORM_FEE_DECIMAL;
}
