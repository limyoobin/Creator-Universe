import { PartnerTier, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";
import { createSessionToken, hashPassword, hashToken, verifyPassword } from "../utils/auth.js";

const SESSION_DAYS = 7;

type SignupInput = {
  email: string;
  username: string;
  displayName: string;
  password: string;
};

function publicUser(user: {
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

async function issueSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function signup(input: SignupInput) {
  const [emailExists, usernameExists] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username: input.username }, select: { id: true } }),
  ]);

  if (emailExists) {
    throw new AppError("Already registered email.", 409);
  }

  if (usernameExists) {
    throw new AppError("Username is already taken.", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash,
      role: UserRole.READER,
      wallet: {
        create: {
          currency: "COIN",
        },
      },
    },
  });

  const session = await issueSession(user.id);

  return {
    user: publicUser(user),
    ...session,
  };
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !user.passwordHash) {
    throw new AppError("Invalid username or password.", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid username or password.", 401);
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
  const user = await prisma.user.findFirst({
    where: { username, email },
    select: { id: true },
  });

  if (!user) {
    throw new AppError("No matching account was found.", 404);
  }

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
