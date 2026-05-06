import { Prisma } from "@prisma/client";

export const ONE_HUNDRED = new Prisma.Decimal(100);

export function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

export function roundToTwo(value: Prisma.Decimal.Value) {
  return toDecimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function decimalToNumber(value: Prisma.Decimal) {
  return value.toNumber();
}
