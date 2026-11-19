import { PartnerTier, UserRole, type Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";
import { createSessionToken, hashPassword, hashToken, verifyPassword } from "../utils/auth.js";
import { type IdentityProof } from "./signup-identity.service.js";
import { identityReady, identityRequired, paymentReady } from "../lib/portone.js";
import { scheduleKakaoUnlinks } from "./kakao-unlink.service.js";

const SESSION_DAYS = 7;

export type SignupAccount = {
  email: string;
  username: string;
  displayName: string;
  identityVerification?: IdentityProof;
};

export const PASSWORD_RULE_MESSAGE = "Password must be at least 8 characters and include a special character.";

export function isValidPassword(password: string) {
  return password.length >= 8 && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
}

export function publicUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  isPartner: boolean;
  partnerTier: PartnerTier;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isPartner: user.isPartner,
    partnerTier: user.partnerTier,
  };
}

export async function issueSession(userId: string, db: Prisma.TransactionClient = prisma) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function checkSignupAvailability(input: SignupAccount, db: Prisma.TransactionClient = prisma, conflictMessage?: string) {
  const [emailExists, usernameExists, displayNameExists] = await Promise.all([
    db.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    db.user.findUnique({ where: { username: input.username }, select: { id: true } }),
    db.user.findFirst({ where: { displayName: input.displayName }, select: { id: true } }),
  ]);

  if (emailExists) {
    throw new AppError(conflictMessage ?? "Already registered email.", 409);
  }

  if (usernameExists) {
    throw new AppError(conflictMessage ?? "Username is already taken.", 409);
  }

  if (displayNameExists) {
    throw new AppError(conflictMessage ?? "Nickname is already taken.", 409);
  }

}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !user.passwordHash) {
    throw new AppError("없는 계정입니다.", 404);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError("아이디 또는 비밀번호가 잘못 입력되었습니다.", 401);
  }

  const session = await issueSession(user.id);

  return {
    user: publicUser(user),
    ...session,
  };
}

export async function getUserBySessionToken(token: string) {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return publicUser(session.user);
}

export async function getUserIdBySessionToken(token: string) {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      userId: true,
      expiresAt: true,
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.userId;
}

export async function enableCreatorMode(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: UserRole.CREATOR },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      isPartner: true,
      partnerTier: true,
    },
  });

  return publicUser(user);
}

export async function logout(token: string) {
  await prisma.authSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });

  return { ok: true };
}

export async function findUsernameByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      username: true,
      displayName: true,
    },
  });

  if (!user) {
    throw new AppError("No account was found for that email.", 404);
  }

  return user;
}

export async function resetPassword(username: string, email: string, newPassword: string) {
  const protectedReset = () => new AppError("계정 보호를 위해 비밀번호 재설정은 고객센터에 문의해 주세요.", 403);
  if (paymentReady() || identityReady() || identityRequired() || process.env.NODE_ENV === "production") {
    throw protectedReset();
  }
  if (!isValidPassword(newPassword)) {
    throw new AppError(PASSWORD_RULE_MESSAGE, 422);
  }

  const user = await prisma.user.findFirst({
    where: { username, email },
    select: { id: true, identityVerifiedAt: true, passwordHash: true },
  });

  if (!user) {
    throw new AppError("No matching account was found.", 404);
  }
  if (!user.passwordHash || user.identityVerifiedAt) throw protectedReset();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
    },
  });

  await prisma.authSession.deleteMany({
    where: { userId: user.id },
  });

  return { ok: true };
}

export async function deactivateAccount(token: string) {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      userId: true,
      expiresAt: true,
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    throw new AppError("Authorization token is invalid or expired.", 401);
  }

  const deletedSuffix = `${session.userId.slice(0, 8)}-${Date.now()}`;

  const kakaoUnlinked = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${session.userId} FOR UPDATE`;
    const kakao = await tx.easyLoginIdentity.findUnique({where: {userId_provider: {userId: session.userId, provider: "kakao"}}});
    if (kakao?.kakaoUserId) {
      await tx.kakaoUnlinkRequest.upsert({where: {subjectHash: kakao.subjectHash}, update: {},
        create: {subjectHash: kakao.subjectHash, kakaoUserId: kakao.kakaoUserId}});
      await tx.easyLoginFlow.deleteMany({where: {provider: "kakao", subjectHash: kakao.subjectHash}});
    }
    await tx.passkeyCredential.deleteMany({ where: { userId: session.userId } });
    await tx.easyLoginIdentity.deleteMany({ where: { userId: session.userId } });
    await tx.authSession.deleteMany({
      where: { userId: session.userId },
    });

    await tx.creatorProfile.deleteMany({
      where: { userId: session.userId },
    });

    await tx.user.update({
      where: { id: session.userId },
      data: {
        email: `deleted-${deletedSuffix}@deleted.creator-universe.local`,
        username: `deleted_${deletedSuffix}`,
        displayName: `Deleted user ${deletedSuffix}`,
        passwordHash: null,
        identityVerifiedAt: null,
        identityVerificationLive: null,
        isPartner: false,
        partnerTier: PartnerTier.NONE,
      },
    });
    return Boolean(kakao?.kakaoUserId);
  });
  if (kakaoUnlinked) scheduleKakaoUnlinks();
  return { ok: true };
}

export async function checkUsernameAvailability(username: string) {
  const normalized = username.trim();
  const user = await prisma.user.findUnique({
    where: { username: normalized },
    select: { id: true },
  });

  return {
    available: !user,
    value: normalized,
  };
}

export async function checkDisplayNameAvailability(displayName: string) {
  const normalized = displayName.trim();
  const user = await prisma.user.findFirst({
    where: { displayName: normalized },
    select: { id: true },
  });

  return {
    available: !user,
    value: normalized,
  };
}
