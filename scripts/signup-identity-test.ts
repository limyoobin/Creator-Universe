import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { AppError } from "../src/errors/app-error.js";
import { checkSignupIdentityRequirement, consumeSignupIdentity, verifiedIdentityTime } from "../src/services/signup-identity.service.js";
import { hashToken } from "../src/utils/auth.js";

// This test process only uses temporary configuration and an in-memory challenge.
Object.assign(process.env, {
  PORTONE_MODE: "live", PORTONE_STORE_ID: "store-fixture", PORTONE_IDENTITY_CHANNEL_KEY: "channel-fixture",
  PORTONE_API_SECRET: "test-fixture", PORTONE_IDENTITY_REQUIRED: "true",
});
const id = "50b18e7d-f953-45d9-9c57-9f8f45cdffbe";
const proof = "a".repeat(64);
const verifiedAt = new Date();
const expected = { id, channelKey: "channel-fixture", live: true };
const record = { id, status: "VERIFIED", channel: { key: expected.channelKey, type: "LIVE" }, verifiedAt: verifiedAt.toISOString() };
assert.equal(verifiedIdentityTime(record, expected).getTime(), verifiedAt.getTime());
for (const override of [
  { status: "FAILED" }, { status: "READY" }, { id: "another-request" },
  { channel: { ...record.channel, type: "TEST" } }, { channel: { ...record.channel, key: "another-channel" } },
  { channel: undefined }, { verifiedAt: undefined }, { verifiedAt: "invalid" },
]) {
  assert.throws(() => verifiedIdentityTime({ ...record, ...override }, expected), AppError);
}
assert.throws(() => checkSignupIdentityRequirement(undefined), AppError);

type ChallengeFilter = { id: string; proofHash: string; storeId: string; channelKey: string; live: boolean; expiresAt: { gt: Date }; verifiedAt: {not: null} };
let row: { id: string; proofHash: string; storeId: string; channelKey: string; live: boolean; expiresAt: Date; verifiedAt: Date | null } | null
  = { ...expected, proofHash: hashToken(proof), storeId: "store-fixture", expiresAt: new Date(Date.now() + 60_000), verifiedAt: null };
function matches(where: ChallengeFilter) {
  return row !== null && row.id === where.id && row.proofHash === where.proofHash &&
    row.storeId === where.storeId && row.channelKey === where.channelKey && row.live === where.live &&
    row.expiresAt > where.expiresAt.gt && where.verifiedAt.not === null && row.verifiedAt !== null;
}
const tx = { signupIdentityChallenge: {
  async findFirst({ where }: { where: ChallengeFilter }) { return matches(where) ? { ...row } : null; },
  async deleteMany({ where }: { where: ChallengeFilter }) {
    if (!matches(where)) return {count: 0};
    row = null;
    return {count: 1};
  },
}} as unknown as Prisma.TransactionClient;
const redeem = (token: string) => consumeSignupIdentity(tx, {identityVerificationId: id, proof: token});
await assert.rejects(redeem(proof), AppError);
row.verifiedAt = verifiedAt;
await assert.rejects(redeem("b".repeat(64)), AppError);
row.live = false;
await assert.rejects(redeem(proof), AppError);
row.live = true;
row.expiresAt = new Date(0);
await assert.rejects(redeem(proof), AppError);
row.expiresAt = new Date(Date.now() + 60_000);
const attempts = await Promise.allSettled([redeem(proof), redeem(proof)]);
assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
await assert.rejects(redeem(proof), AppError);
delete process.env.PORTONE_API_SECRET;
assert.throws(() => checkSignupIdentityRequirement(undefined), (error) => error instanceof AppError && error.statusCode === 503);
process.env.PORTONE_IDENTITY_REQUIRED = "false";
assert.doesNotThrow(() => checkSignupIdentityRequirement(undefined));
console.log("Signup verification checks passed (provider result, mode, private proof, expiry, one-time use, missing configuration).");
