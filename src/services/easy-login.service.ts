import { randomUUID } from "node:crypto";
import { Prisma, UserRole, type EasyLoginFlow } from "@prisma/client";
import { AppError } from "../errors/app-error.js";
import { easyProviderScope, easyStartPayload, resolveEasySubject, type EasyProvider } from "../lib/easy-login-providers.js";
import { prisma } from "../lib/prisma.js";
import { createSessionToken, hashToken } from "../utils/auth.js";
import { checkSignupAvailability, issueSession, publicUser, type SignupAccount } from "./auth.service.js";
import { checkSignupIdentityRequirement, consumeSignupIdentity } from "./signup-identity.service.js";

const invalidFlow = () => new AppError("간편 로그인 요청을 확인할 수 없습니다. 시작한 창에서 다시 시도해 주세요.", 409);
const accountConflict = "가입 정보를 사용 중입니다. 기존 계정으로 로그인하거나 다른 정보로 시도해 주세요.";
type Proof = { state: string; proof: string };
const lifetime = 15 * 60_000;

function scopeFor(provider: EasyProvider) {
  const scope = easyProviderScope(provider);
  if (!scope) throw new AppError("이 간편 로그인 채널은 아직 연결되지 않았습니다.", 503);
  return scope;
}
async function sessionUser(db: Prisma.TransactionClient, tokenHash: string) {
  const session = await db.authSession.findFirst({where: {tokenHash, expiresAt: {gt: new Date()}}, select: {userId: true}});
  if (!session) throw new AppError("로그인한 뒤 계정 설정에서 다시 연결해 주세요.", 401);
  return session.userId;
}
export async function easyConnections(tokenHash: string) {
  const userId = await sessionUser(prisma, tokenHash);
  const ids = await prisma.easyLoginIdentity.findMany({where: {userId}, select: {provider: true}});
  return {providers: ids.map(identity => identity.provider)};
}
export async function startEasyLogin(provider: EasyProvider, origin: string, mode: "login" | "link", tokenHash: string | null) {
  const configScope = scopeFor(provider);
  if (mode === "link") {
    if (!tokenHash) throw new AppError("연결할 계정으로 먼저 로그인해 주세요.", 401);
    await sessionUser(prisma, tokenHash);
  }
  const state = randomUUID();
  const proof = createSessionToken();
  const expiresAt = new Date(Date.now() + lifetime);
  await prisma.$transaction([
    prisma.easyLoginFlow.deleteMany({where: {expiresAt: {lte: new Date()}}}),
    prisma.easyLoginFlow.create({data: {id: state, proofHash: hashToken(proof), provider, origin, configScope,
      linkSessionHash: mode === "link" ? tokenHash : null, expiresAt}}),
  ]);
  return {state, proof, expiresAt, ...easyStartPayload(provider, origin, state, proof)};
}
function active(provider: EasyProvider, origin: string, input: Proof) {
  return {id: input.state, provider, origin, proofHash: hashToken(input.proof), configScope: scopeFor(provider), expiresAt: {gt: new Date()}};
}
async function validFlow(db: Prisma.TransactionClient, provider: EasyProvider, origin: string, input: Proof, tokenHash: string | null) {
  const flow = await db.easyLoginFlow.findFirst({where: active(provider, origin, input)});
  if (!flow || flow.linkSessionHash !== tokenHash) throw invalidFlow();
  return flow;
}
async function lockSubject(tx: Prisma.TransactionClient, subjectHash: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${subjectHash}))`;
}
async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}
async function assertKakaoAvailable(tx: Prisma.TransactionClient, kakaoUserId: string | null, subjectHash: string) {
  if (kakaoUserId && await tx.kakaoUnlinkRequest.findUnique({where: {subjectHash}})) {
    throw new AppError("카카오 계정의 이전 연결을 해제하고 있습니다. 잠시 뒤 다시 시도해 주세요.", 409);
  }
}
async function finishVerifiedFlow(tx: Prisma.TransactionClient, flow: EasyLoginFlow, result: Awaited<ReturnType<typeof resolveEasySubject>>) {
  const {subjectHash, verifiedAt, kakaoUserId} = result;
  const where = {provider_subjectHash: {provider: flow.provider, subjectHash}};
  await lockSubject(tx, subjectHash);
  await assertKakaoAvailable(tx, kakaoUserId, subjectHash);
  const identity = await tx.easyLoginIdentity.findUnique({where});
  if (flow.linkSessionHash) {
    const userId = await sessionUser(tx, flow.linkSessionHash);
    await lockUser(tx, userId);
    await sessionUser(tx, flow.linkSessionHash);
    const current = await tx.easyLoginIdentity.findUnique({where: {userId_provider: {userId, provider: flow.provider}}});
    if ((identity && identity.userId !== userId) || (current && current.subjectHash !== subjectHash)) {
      throw new AppError("이미 연결된 로그인 수단입니다. 연결 정보를 확인해 주세요.", 409);
    }
    if (!identity) await tx.easyLoginIdentity.create({data: {userId, provider: flow.provider, subjectHash, kakaoUserId}});
    if (verifiedAt) await tx.user.update({where: {id: userId}, data: {identityVerifiedAt: verifiedAt, identityVerificationLive: true}});
    await tx.easyLoginFlow.delete({where: {id: flow.id}});
    return {kind: "linked" as const};
  }
  if (identity) {
    await lockUser(tx, identity.userId);
    // Deactivation uses the same user lock and removes registered providers.
    const current = await tx.easyLoginIdentity.findUnique({where, include: {user: true}});
    if (!current || current.userId !== identity.userId) throw invalidFlow();
    await tx.easyLoginFlow.delete({where: {id: flow.id}});
    return {kind: "session" as const, user: publicUser(current.user), ...await issueSession(current.userId, tx)};
  }
  await tx.easyLoginFlow.update({where: {id: flow.id}, data: {status: "signup", subjectHash, verifiedAt, kakaoUserId}});
  return {kind: "signup" as const};
}

export async function completeEasyLogin(provider: EasyProvider, origin: string, input: Proof & {code?: string}, tokenHash: string | null) {
  const flow = await validFlow(prisma, provider, origin, input, tokenHash);
  if (flow.status === "signup") return {kind: "signup" as const};
  const locked = await prisma.easyLoginFlow.updateMany({where: {...active(provider, origin, input), status: "pending"}, data: {status: "verifying"}});
  if (locked.count !== 1) throw invalidFlow();
  try {
    const result = await resolveEasySubject(provider, origin, flow.id, input.proof, input.code);
    if (result.verifiedAt && (result.verifiedAt.getTime() < flow.createdAt.getTime() - 60_000 || result.verifiedAt.getTime() > Date.now() + 60_000)) throw invalidFlow();
    return await prisma.$transaction(async tx => {
      const updated = await tx.easyLoginFlow.updateMany({where: {...active(provider, origin, input), status: "verifying"}, data: {status: "verified"}});
      if (updated.count !== 1) throw invalidFlow();
      return finishVerifiedFlow(tx, flow, result);
    });
  } catch (error) {
    // PASS is a read-only provider lookup and can be retried while the gateway settles.
    // OAuth codes may already have been spent, so a new approval is needed.
    if (provider === "pass") await prisma.easyLoginFlow.updateMany({where: {id: flow.id, status: "verifying"}, data: {status: "pending"}});
    else await prisma.easyLoginFlow.deleteMany({where: {id: flow.id, status: "verifying"}});
    throw error;
  }
}

export async function registerEasyAccount(provider: EasyProvider, origin: string, input: Proof, account: SignupAccount) {
  try {
    return await prisma.$transaction(async tx => {
      const flow = await validFlow(tx, provider, origin, input, null);
      if (flow.status !== "signup" || !flow.subjectHash) throw invalidFlow();
      const consumed = await tx.easyLoginFlow.deleteMany({where: {...active(provider, origin, input), status: "signup", linkSessionHash: null}});
      if (consumed.count !== 1) throw invalidFlow();
      await lockSubject(tx, flow.subjectHash);
      await assertKakaoAvailable(tx, flow.kakaoUserId, flow.subjectHash);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${account.displayName}))`;
      await checkSignupAvailability(account, tx, accountConflict);
      let identity = {};
      if (provider === "pass") {
        if (!flow.verifiedAt) throw invalidFlow();
        identity = {identityVerifiedAt: flow.verifiedAt, identityVerificationLive: true};
      } else {
        checkSignupIdentityRequirement(account.identityVerification);
        if (account.identityVerification) identity = await consumeSignupIdentity(tx, account.identityVerification);
      }
      const user = await tx.user.create({data: {
        email: account.email, username: account.username, displayName: account.displayName, role: UserRole.READER,
        ...identity, wallet: {create: {currency: "COIN"}},
        easyIdentities: {create: {provider, subjectHash: flow.subjectHash, kakaoUserId: flow.kakaoUserId}},
      }});
      return {kind: "session" as const, user: publicUser(user), ...await issueSession(user.id, tx)};
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(accountConflict, 409);
    }
    throw error;
  }
}
