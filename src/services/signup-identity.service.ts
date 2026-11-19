import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { identityReady, identityRequired, portOneConfig, portOneGet } from "../lib/portone.js";
import { createSessionToken, hashToken } from "../utils/auth.js";

const lifetimeMs = 15 * 60_000;

export type IdentityProof = { identityVerificationId: string; proof: string };

function identityChannel() {
  if (!identityReady()) throw new AppError("현재 간편인증을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.", 503);
  const { storeId, identityChannelKey: channelKey, live } = portOneConfig();
  return { storeId, channelKey, live };
}

function invalidChallenge() {
  return new AppError("가입 인증 요청이 만료되었거나 유효하지 않습니다. 간편인증을 다시 시작해 주세요.", 409);
}

export async function startSignupIdentity() {
  const channel = identityChannel();
  const expiresAt = new Date(Date.now() + lifetimeMs);
  const identityVerificationId = randomUUID();
  const proof = createSessionToken();
  await prisma.$transaction([
    prisma.signupIdentityChallenge.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.signupIdentityChallenge.create({
      data: { id: identityVerificationId, ...channel, proofHash: hashToken(proof), expiresAt },
    }),
  ]);
  return { identityVerificationId, proof, storeId: channel.storeId, channelKey: channel.channelKey, expiresAt };
}

function activeChallenge(input: IdentityProof) {
  return {
    id: input.identityVerificationId,
    proofHash: hashToken(input.proof),
    expiresAt: { gt: new Date() },
    ...identityChannel(),
  };
}

// PortOne scopes the lookup by storeId and returns the channel used for this verification.
// Only the non-personal fields needed to accept the result cross this boundary.
export function verifiedIdentityTime(
  record: { id?: string; status?: string; channel?: { key?: string; type?: string }; verifiedAt?: string } | null,
  expected: { id: string; channelKey: string; live: boolean },
) {
  if (record?.id !== expected.id || record?.status !== "VERIFIED" ||
      record.channel?.key !== expected.channelKey || record.channel.type !== (expected.live ? "LIVE" : "TEST")) {
    throw new AppError("해당 가입 요청의 본인인증 완료 내역을 확인할 수 없습니다.", 409);
  }
  const time = new Date(record.verifiedAt ?? "");
  if (!Number.isFinite(time.getTime())) throw new AppError("인증 완료 시각을 확인할 수 없습니다.", 502);
  return time;
}

export async function confirmSignupIdentity(input: IdentityProof) {
  const where = activeChallenge(input);
  const challenge = await prisma.signupIdentityChallenge.findFirst({ where, select: { verifiedAt: true } });
  if (!challenge) throw invalidChallenge();
  if (!challenge.verifiedAt) {
    const record = await portOneGet<Parameters<typeof verifiedIdentityTime>[0]>(
      `/identity-verifications/${encodeURIComponent(where.id)}`,
    );
    const verifiedAt = verifiedIdentityTime(record, where);
    const updated = await prisma.signupIdentityChallenge.updateMany({
      where: activeChallenge(input), data: { verifiedAt },
    });
    if (updated.count !== 1) throw invalidChallenge();
  }
  return { verified: true };
}

export function checkSignupIdentityRequirement(input: IdentityProof | undefined) {
  if (input || identityRequired()) identityChannel();
  if (!input && identityRequired()) throw new AppError("회원가입 전에 간편인증을 완료해 주세요.", 422);
}

export async function consumeSignupIdentity(tx: Prisma.TransactionClient, input: IdentityProof) {
  const where = { ...activeChallenge(input), verifiedAt: { not: null } };
  const challenge = await tx.signupIdentityChallenge.findFirst({ where, select: { verifiedAt: true, live: true } });
  if (!challenge?.verifiedAt) throw invalidChallenge();
  const consumed = await tx.signupIdentityChallenge.deleteMany({ where });
  if (consumed.count !== 1) throw invalidChallenge();
  return { identityVerifiedAt: challenge.verifiedAt, identityVerificationLive: challenge.live };
}
