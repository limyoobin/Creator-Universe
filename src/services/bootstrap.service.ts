import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/auth.js";

const blockedProductionPasswords = new Set(["toor", "root", "password", "change-this-password", "admin1234"]);

function assertSafeRootPassword(password: string) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (password.length < 12 || blockedProductionPasswords.has(password.toLowerCase())) {
    throw new Error(
      "Unsafe ROOT_ADMIN_PASSWORD in production. Remove ROOT_ADMIN_PASSWORD or use a unique password with at least 12 characters.",
    );
  }
}

export async function ensureOptionalRootAccount() {
  const rootPassword = process.env.ROOT_ADMIN_PASSWORD;
  if (!rootPassword) {
    return;
  }

  assertSafeRootPassword(rootPassword);

  const rootUsername = process.env.ROOT_ADMIN_USERNAME || "root";
  const rootEmail = process.env.ROOT_ADMIN_EMAIL || "root@creator-universe.local";
  const passwordHash = await hashPassword(rootPassword);
  const existing = await prisma.user.findUnique({
    where: { username: rootUsername },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: rootEmail,
        displayName: "Root Admin",
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: existing.id },
      update: {},
      create: {
        userId: existing.id,
        balance: 100000,
        currency: "COIN",
      },
    });

    return;
  }

  await prisma.user.create({
    data: {
      email: rootEmail,
      username: rootUsername,
      displayName: "Root Admin",
      passwordHash,
      role: UserRole.ADMIN,
      wallet: {
        create: {
          balance: 100000,
          currency: "COIN",
        },
      },
    },
  });
}
