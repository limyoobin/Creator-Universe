import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

const db = new URL(process.env.PORTONE_TEST_DATABASE_URL ?? "about:blank");
if (db.protocol !== "postgresql:" || db.hostname !== "127.0.0.1" || db.username !== "cu_portone_qa") {
  throw new Error("Set PORTONE_TEST_DATABASE_URL to a disposable local PostgreSQL database.");
}
const origin = "https://project-limyoobins-projects.vercel.app";
// Even a deployment that retains old provider keys must use password signup.
Object.assign(process.env, {
  DATABASE_URL: db.href, NODE_ENV: "production",
  KAKAO_REST_API_KEY: "fixture-app", KAKAO_CLIENT_SECRET: "fixture-secret", KAKAO_ADMIN_KEY: "fixture-admin",
  NAVER_CLIENT_ID: "fixture-naver", NAVER_CLIENT_SECRET: "fixture-secret",
  EASY_LOGIN_HMAC_SECRET: "fixture-only-PASS-key-with-sufficient-length",
  PORTONE_MODE: "live", PORTONE_STORE_ID: "fixture-store", PORTONE_API_SECRET: "fixture-api-secret",
  PORTONE_IDENTITY_CHANNEL_KEY: "fixture-identity", PORTONE_IDENTITY_REQUIRED: "true",
});

const {default: app} = await import("../src/app.js");
const {prisma} = await import("../src/lib/prisma.js");
const {kakaoSubject} = await import("../src/lib/kakao.js");
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  assert.equal(url.origin, base, "The password site must not contact an external auth provider.");
  return originalFetch(input, init);
};

async function request(path: string, method = "GET", body?: unknown, token?: string) {
  const res = await fetch(base + "/api/auth/" + path, {
    method, headers: {"Content-Type": "application/json", Origin: origin, ...(token ? {Authorization: "Bearer " + token} : {})},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  return {status: res.status, value: await res.json()};
}
const run = randomUUID().slice(0, 8);
const member = (code: string) => ({
  username: code + "_" + run, displayName: code + "_" + run,
  email: code + "_" + run + "@example.invalid", password: "Local!Only_" + run,
});

try {
  const providers = await request("easy/providers");
  assert.deepEqual(providers.value.data, {kakao: false, naver: false, pass: false});
  for (const provider of ["kakao", "naver", "pass"]) {
    for (const step of ["start", "complete", "signup"]) {
      assert.equal((await request("easy/" + provider + "/" + step, "POST", {})).status, 410);
    }
  }
  for (const path of ["identity/start", "identity/confirm", "passkeys/register/options", "passkeys/register/verify"]) {
    assert.equal((await request(path, "POST", {})).status, 410);
  }

  const account = member("reader");
  assert.equal((await request("signup", "POST", {...account, password: "password123"})).status, 422);
  assert.equal(await prisma.user.count({where: {username: account.username}}), 0);
  const registered = await request("signup", "POST", {...account, role: "ADMIN", balance: 99999});
  assert.equal(registered.status, 201);
  const {user, token} = registered.value.data;
  assert.equal(user.role, "READER");
  assert.ok(token);
  assert.equal(await prisma.passkeyCredential.count({where: {userId: user.id}}), 0);
  const row = await prisma.user.findUniqueOrThrow({where: {id: user.id}, include: {wallet: true}});
  assert.ok(row.passwordHash && row.passwordHash !== account.password);
  assert.equal(row.identityVerifiedAt, null);
  assert.equal(row.wallet?.balance.toNumber(), 0);
  assert.equal((await request("me", "GET", undefined, token)).value.data.id, user.id);
  assert.equal((await request("signup", "POST", account)).status, 409);
  assert.equal((await request("login", "POST", {username: account.username, password: "incorrect"})).status, 401);
  assert.equal((await request("me/creator-mode", "POST", {}, token)).value.data.user.role, "CREATOR");
  await request("logout", "POST", {}, token);
  assert.equal((await request("me", "GET", undefined, token)).value.data, null);
  const session = (await request("login", "POST", account)).value.data;
  assert.equal(session.user.id, user.id);
  assert.equal(session.user.role, "CREATOR");
  assert.equal((await request("reset-password", "POST", {
    username: account.username, email: account.email, newPassword: "New!Fixture",
  })).status, 403);

  const twin = {...member("second"), displayName: "shared_" + run};
  const competing = await Promise.all([request("signup", "POST", twin),
    request("signup", "POST", {...member("third"), displayName: twin.displayName})]);
  assert.deepEqual(competing.map(res => res.status).sort(), [201, 409]);

  // Legacy provider unlink callbacks still remove the connection and revoke sessions.
  const kakaoUserId = (9007199254740993n + BigInt(randomInt(1, 2 ** 31))).toString();
  await prisma.easyLoginIdentity.create({data: {provider: "kakao", userId: user.id, kakaoUserId, subjectHash: kakaoSubject(kakaoUserId)}});
  async function unlink(authorization: string) {
    const res = await fetch(base + "/api/auth/easy/kakao/unlink-callback", {method: "POST", headers: {Authorization: authorization},
      body: new URLSearchParams({user_id: kakaoUserId})});
    return res.status;
  }
  assert.equal(await unlink("wrong"), 401);
  assert.equal(await unlink("KakaoAK fixture-admin"), 200);
  assert.equal(await unlink("KakaoAK fixture-admin"), 200);
  assert.equal((await request("me", "GET", undefined, session.token)).value.data, null);
  assert.equal(await prisma.easyLoginIdentity.count({where: {userId: user.id}}), 0);
  assert.equal((await request("login", "POST", account)).value.data.user.id, user.id);
  console.log("Passed password signup, roles, wallets, duplicate registration, session continuity, disabled external enrollment and existing Kakao unlink.");
} finally {
  globalThis.fetch = originalFetch;
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  await prisma.$disconnect();
}
