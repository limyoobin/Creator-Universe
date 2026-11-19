import { timingSafeEqual } from "node:crypto";
import { AppError } from "../errors/app-error.js";
import { kakaoAdminKey, kakaoSubject, revokeKakao } from "../lib/kakao.js";
import { prisma } from "../lib/prisma.js";
import { hashToken } from "../utils/auth.js";

// The row is created in the local account-deletion transaction. A stopped service
// or temporary provider outage must not lose the revocation request.
export async function flushKakaoUnlinks() {
  // Delete incomplete signups, including any temporary provider identifiers.
  await prisma.easyLoginFlow.deleteMany({where: {expiresAt: {lte: new Date()}}});
  if (!kakaoAdminKey()) return;
  const due = await prisma.kakaoUnlinkRequest.findMany({where: {retryAt: {lte: new Date()}}, orderBy: {retryAt: "asc"}, take: 10});
  for (const job of due) {
    const claim = await prisma.kakaoUnlinkRequest.updateMany({where: {subjectHash: job.subjectHash, retryAt: job.retryAt},
      data: {retryAt: new Date(Date.now() + 5 * 60_000)}});
    if (claim.count !== 1 || kakaoSubject(job.kakaoUserId) !== job.subjectHash) continue;
    try {
      if (await revokeKakao(job.kakaoUserId)) await prisma.kakaoUnlinkRequest.deleteMany({where: {subjectHash: job.subjectHash}});
    } catch { /* Retry the queued request on the next scheduled attempt. */ }
  }
}

export function scheduleKakaoUnlinks() {
  void flushKakaoUnlinks().catch(() => console.error("Kakao disconnect queue could not be checked."));
}

export async function acceptKakaoUnlink(authorization: string | undefined, id: unknown) {
  const secret = kakaoAdminKey();
  if (!secret || !authorization || !timingSafeEqual(Buffer.from(hashToken(authorization)), Buffer.from(hashToken("KakaoAK " + secret)))) {
    throw new AppError("Invalid callback credentials.", 401);
  }
  if (typeof id !== "string" || !/^[1-9]\d{0,18}$/.test(id)) throw new AppError("Invalid user identifier.", 400);
  const subjectHash = kakaoSubject(id);
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${subjectHash}))`;
    const identity = await tx.easyLoginIdentity.findUnique({where: {provider_subjectHash: {provider: "kakao", subjectHash}}});
    if (identity) {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${identity.userId} FOR UPDATE`;
      await tx.easyLoginIdentity.deleteMany({where: {id: identity.id}});
      await tx.authSession.deleteMany({where: {userId: identity.userId}});
    }
    await tx.easyLoginFlow.deleteMany({where: {provider: "kakao", subjectHash}});
    await tx.kakaoUnlinkRequest.deleteMany({where: {subjectHash}});
  });
}
