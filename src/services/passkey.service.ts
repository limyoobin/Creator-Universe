import { randomUUID } from "node:crypto";
import { Prisma, UserRole } from "@prisma/client";
import {
  generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse,
  type RegistrationResponseJSON, type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { hashToken } from "../utils/auth.js";
import { checkSignupAvailability, issueSession, publicUser, type SignupAccount } from "./auth.service.js";
import { checkSignupIdentityRequirement, consumeSignupIdentity } from "./signup-identity.service.js";

const liveOrigin = "https://project-limyoobins-projects.vercel.app";
const lifetime = 5 * 60_000;
const algorithms = [-7, -257, -8];
const invalid = () => new AppError("패스키 요청이 만료되었거나 확인되지 않았습니다. 다시 시도해 주세요.", 401);

export function passkeyOrigin(origin: string | undefined) {
  if (origin === liveOrigin) return { origin, rpID: new URL(origin).hostname };
  if (process.env.NODE_ENV !== "production" && origin && /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(origin)) {
    try {
      const url = new URL(origin);
      if (url.origin === origin) return { origin, rpID: url.hostname };
    } catch { /* Invalid loopback origins use the same rejection as external origins. */ }
  }
  throw new AppError("크리에이터 유니버스 사이트에서 패스키를 이용해 주세요.", 403);
}
type Site = ReturnType<typeof passkeyOrigin>;
type Purpose = "register" | "login";

function checkPageContext(clientData: string) {
  try {
    if (!decodeClientDataJSON(clientData).crossOrigin) return;
  } catch { /* Malformed client data cannot be verified. */ }
  throw invalid();
}

function accountDigest(account: SignupAccount) {
  return hashToken(JSON.stringify([account.email, account.username, account.displayName,
    account.identityVerification?.identityVerificationId, account.identityVerification?.proof]));
}

async function newChallenge(purpose: Purpose, origin: string, challenge: string, accountId?: string, digest?: string) {
  const [, created] = await prisma.$transaction([
    prisma.passkeyChallenge.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.passkeyChallenge.create({ data: {
      purpose, origin, challenge, accountId, accountDigest: digest, expiresAt: new Date(Date.now() + lifetime),
    }, select: { id: true } }),
  ]);
  return created.id;
}

function active(id: string, purpose: Purpose, origin: string) {
  return { id, purpose, origin, expiresAt: { gt: new Date() } };
}

async function consume(tx: Prisma.TransactionClient, id: string, purpose: Purpose, origin: string) {
  const consumed = await tx.passkeyChallenge.deleteMany({where: active(id, purpose, origin)});
  if (consumed.count !== 1) throw invalid();
}

export async function startPasskeyRegistration(site: Site, account: SignupAccount) {
  checkSignupIdentityRequirement(account.identityVerification);
  await checkSignupAvailability(account);
  const accountId = randomUUID();
  const options = await generateRegistrationOptions({
    rpName: "크리에이터 유니버스", rpID: site.rpID, userID: new TextEncoder().encode(accountId),
    userName: account.username, userDisplayName: account.displayName, timeout: lifetime, attestationType: "none", supportedAlgorithmIDs: algorithms,
    authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
  });
  const ceremonyId = await newChallenge("register", site.origin, options.challenge, accountId, accountDigest(account));
  return { ceremonyId, options };
}

export async function finishPasskeyRegistration(site: Site, ceremonyId: string, account: SignupAccount, response: RegistrationResponseJSON) {
  checkSignupIdentityRequirement(account.identityVerification);
  checkPageContext(response.response.clientDataJSON);
  const ceremony = await prisma.passkeyChallenge.findFirst({where: active(ceremonyId, "register", site.origin)});
  if (!ceremony?.accountId || ceremony.accountDigest !== accountDigest(account) || response.clientExtensionResults?.credProps?.rk === false) throw invalid();
  const accountId = ceremony.accountId;
  const result = await verifyRegistrationResponse({
    response, expectedOrigin: site.origin, expectedRPID: site.rpID, expectedChallenge: ceremony.challenge, requireUserVerification: true,
    supportedAlgorithmIDs: algorithms,
  }).catch(() => { throw invalid(); });
  if (!result.verified || !result.registrationInfo?.userVerified) throw invalid();
  const { credential } = result.registrationInfo;
  if (credential.id !== response.id) throw invalid();
  try {
    return await prisma.$transaction(async tx => {
      await consume(tx, ceremonyId, "register", site.origin);
      // displayName on pre-existing accounts is not a unique column. Serialize the duplicate check.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${account.displayName}))`;
      await checkSignupAvailability(account, tx);
      const identity = account.identityVerification ? await consumeSignupIdentity(tx, account.identityVerification) : {};
      const user = await tx.user.create({data: {
        id: accountId, email: account.email, username: account.username, displayName: account.displayName, role: UserRole.READER,
        ...identity, wallet: {create: {currency: "COIN"}},
        passkeys: {create: {id: credential.id, publicKey: Buffer.from(credential.publicKey).toString("base64url"), rpId: site.rpID, counter: credential.counter}},
      }});
      return {user: publicUser(user), ...await issueSession(user.id, tx)};
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("이미 사용 중인 계정 정보 또는 패스키입니다.", 409);
    }
    throw error;
  }
}

export async function startPasskeyLogin(site: Site) {
  const options = await generateAuthenticationOptions({rpID: site.rpID, userVerification: "required", timeout: lifetime});
  return {ceremonyId: await newChallenge("login", site.origin, options.challenge), options};
}

export async function finishPasskeyLogin(site: Site, ceremonyId: string, response: AuthenticationResponseJSON) {
  checkPageContext(response.response.clientDataJSON);
  const [ceremony, key] = await Promise.all([
    prisma.passkeyChallenge.findFirst({where: active(ceremonyId, "login", site.origin)}),
    prisma.passkeyCredential.findUnique({where: {id: response.id}}),
  ]);
  if (!ceremony || !key || key.rpId !== site.rpID || response.response.userHandle !== Buffer.from(key.userId).toString("base64url")) throw invalid();
  const result = await verifyAuthenticationResponse({
    response, expectedOrigin: site.origin, expectedRPID: site.rpID, expectedChallenge: ceremony.challenge, requireUserVerification: true,
    credential: {id: key.id, publicKey: Uint8Array.from(Buffer.from(key.publicKey, "base64url")), counter: Number(key.counter)},
  }).catch(() => { throw invalid(); });
  if (!result.verified || !result.authenticationInfo.userVerified) throw invalid();
  return prisma.$transaction(async tx => {
    await consume(tx, ceremonyId, "login", site.origin);
    // Account deletion uses the same lock before deleting keys and sessions.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${key.userId} FOR UPDATE`;
    const current = await tx.passkeyCredential.updateMany({
      where: {id: key.id, userId: key.userId, counter: key.counter},
      data: {counter: result.authenticationInfo.newCounter},
    });
    if (current.count !== 1) throw invalid();
    const user = await tx.user.findUniqueOrThrow({where: {id: key.userId}});
    return {user: publicUser(user), ...await issueSession(user.id, tx)};
  });
}
