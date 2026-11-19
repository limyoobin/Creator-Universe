import assert from "node:assert/strict";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { makeTestPasskey } from "./passkey-test-fixture.js";

const db = new URL(process.env.PORTONE_TEST_DATABASE_URL ?? "about:blank");
if (db.protocol !== "postgresql:" || db.hostname !== "127.0.0.1" || db.username !== "cu_portone_qa") {
  throw new Error("Set PORTONE_TEST_DATABASE_URL to a disposable local PostgreSQL database.");
}
const site = "https://project-limyoobins-projects.vercel.app";
const run = randomUUID().slice(0, 8);
const accounts = (tag: string) => {
  const username = tag + "_" + run;
  return {username, displayName: username, email: username + "@example.invalid"};
};
const kakaoAccountId = (9007199254740993n + BigInt(randomInt(1, 2 ** 31))).toString();
const oldAccount = accounts("old");
Object.assign(process.env, {
  DATABASE_URL: db.href, NODE_ENV: "production",
  KAKAO_REST_API_KEY: "fixture-kakao-app", KAKAO_CLIENT_SECRET: "fixture-kakao-secret", KAKAO_ADMIN_KEY: "fixture-admin-key",
  NAVER_CLIENT_ID: "fixture-naver-app", NAVER_CLIENT_SECRET: "fixture-naver-secret",
  EASY_LOGIN_HMAC_SECRET: "fixture-only-PASS-key-with-sufficient-length",
  PORTONE_MODE: "live", PORTONE_STORE_ID: "fixture-store", PORTONE_API_SECRET: "fixture-portone-secret",
  PORTONE_IDENTITY_CHANNEL_KEY: "fixture-identity", PORTONE_IDENTITY_REQUIRED: "false",
});

const {default: app} = await import("../src/app.js");
const {prisma} = await import("../src/lib/prisma.js");
const {flushKakaoUnlinks} = await import("../src/services/kakao-unlink.service.js");
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
const realFetch = globalThis.fetch;
type Provider = "kakao" | "naver" | "pass";
type Flow = {state: string; proof: string; authorizationUrl?: string; identityVerificationId?: string};
const pendingCodes = new Map<string, {flow: Flow; provider: Provider}>();
const goodTokens = new Set<string>();
let passRecord: Record<string, unknown> = {};
const ci = "fixture-ci-" + randomUUID();
let unlinkResponds = false;
let unlinkCalls = 0;

// Only localhost receives real traffic. All remote exchanges use these explicit fixtures.
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  if (url.origin === base) return realFetch(input, init);
  const headers = new Headers(init?.headers);
  if (url.href === "https://kauth.kakao.com/oauth/token" || url.href === "https://nid.naver.com/oauth2.0/token") {
    const provider = url.hostname === "kauth.kakao.com" ? "kakao" : "naver";
    const body = new URLSearchParams(init?.body?.toString());
    const code = body.get("code") ?? "";
    const grant = pendingCodes.get(code);
    assert.equal(init?.method, "POST");
    assert.equal(body.get("client_id"), "fixture-" + provider + "-app");
    assert.equal(body.get("client_secret"), "fixture-" + provider + "-secret");
    assert.equal(body.get("grant_type"), "authorization_code");
    assert.equal(body.get("redirect_uri"), site + "/auth/return/" + provider);
    if (!grant || grant.provider !== provider) return Response.json({error: "invalid_grant"}, {status: 400});
    if (provider === "kakao") assert.equal(body.get("code_verifier"), grant.flow.proof);
    if (provider === "naver") assert.equal(body.get("state"), grant.flow.state);
    pendingCodes.delete(code);
    const token = randomUUID();
    goodTokens.add(provider + token);
    return Response.json({access_token: token});
  }
  if (url.href === "https://kapi.kakao.com/v1/user/access_token_info" || url.href === "https://openapi.naver.com/v1/nid/me") {
    const provider = url.hostname === "kapi.kakao.com" ? "kakao" : "naver";
    const token = headers.get("Authorization")?.replace(/^Bearer /, "");
    assert.ok(goodTokens.delete(provider + token));
    if (provider === "kakao") return new Response('{"id":' + kakaoAccountId + '}');
    return Response.json({
      resultcode: "00", response: {id: "fixture-naver-" + run, email: oldAccount.email, nickname: oldAccount.displayName},
    });
  }
  if (url.href === "https://kapi.kakao.com/v1/user/unlink") {
    assert.equal(init?.method, "POST");
    assert.equal(headers.get("Authorization"), "KakaoAK fixture-admin-key");
    const body = new URLSearchParams(init?.body?.toString());
    assert.equal(body.get("target_id_type"), "user_id");
    assert.equal(body.get("target_id"), kakaoAccountId);
    unlinkCalls++;
    return unlinkResponds ? new Response('{"id":' + kakaoAccountId + '}') : Response.json({}, {status: 503});
  }
  if (url.origin === "https://api.portone.io" && url.pathname.startsWith("/identity-verifications/")) {
    assert.equal(url.searchParams.get("storeId"), "fixture-store");
    assert.equal(headers.get("Authorization"), "PortOne fixture-portone-secret");
    return Response.json({id: url.pathname.split("/").at(-1), status: "VERIFIED",
      verifiedAt: new Date().toISOString(), channel: {key: "fixture-identity", type: "LIVE"},
      verifiedCustomer: {ci}, ...passRecord});
  }
  throw new Error("Unexpected network destination in test");
};

async function request(path: string, method: string, body?: unknown, token?: string, origin = site) {
  const response = await fetch(base + "/api/auth/" + path, {method, headers: {"Content-Type": "application/json", Origin: origin,
    ...(token ? {Authorization: "Bearer " + token} : {})}, body: body === undefined ? undefined : JSON.stringify(body)});
  if (path.startsWith("easy/")) assert.equal(response.headers.get("Cache-Control"), "no-store");
  return {status: response.status, value: await response.json()};
}
function easy(provider: Provider, action: string, body: unknown, token?: string, origin?: string) {
  return request("easy/" + provider + "/" + action, "POST", body, token, origin);
}
async function start(provider: Provider, token?: string): Promise<Flow> {
  const result = await easy(provider, "start", {mode: token ? "link" : "login"}, token);
  assert.equal(result.status, 201, JSON.stringify(result.value));
  const data = result.value.data;
  assert.match(data.proof, /^[0-9a-f]{64}$/);
  if (provider === "pass") {
    assert.equal(data.identityVerificationId, data.state);
    assert.equal(data.channelKey, "fixture-identity");
  } else {
    const url = new URL(data.authorizationUrl);
    assert.equal(url.hostname, provider === "naver" ? "nid.naver.com" : "kauth.kakao.com");
    assert.equal(url.searchParams.get("state"), data.state);
    assert.equal(url.searchParams.get("redirect_uri"), site + "/auth/return/" + provider);
    assert.ok(!data.authorizationUrl.includes(data.proof));
    assert.ok(!url.searchParams.has("client_secret"));
    if (provider === "kakao") {
      assert.equal(url.searchParams.get("code_challenge_method"), "S256");
      assert.equal(url.searchParams.get("code_challenge"), createHash("sha256").update(data.proof).digest("base64url"));
    }
  }
  return data;
}
function grant(provider: Provider, flow: Flow) {
  const code = randomUUID();
  pendingCodes.set(code, {provider, flow});
  return {state: flow.state, proof: flow.proof, code: provider === "pass" ? undefined : code};
}
const checkKind = (result: {status: number; value: {data?: {kind?: string}}}, status: number, kind: string) => {
  assert.equal(result.status, status, JSON.stringify(result.value));
  assert.equal(result.value.data?.kind, kind);
};

try {
  const status = () => request("easy/providers", "GET");
  assert.deepEqual((await status()).value.data, {kakao: true, naver: true, pass: true});
  process.env.PORTONE_MODE = "test";
  assert.equal((await status()).value.data.pass, false);
  assert.equal((await easy("pass", "start", {mode: "login"})).status, 503);
  process.env.PORTONE_MODE = "live";
  process.env.NAVER_CLIENT_SECRET = "";
  assert.equal((await status()).value.data.naver, false);
  process.env.NAVER_CLIENT_SECRET = "fixture-naver-secret";
  assert.equal((await easy("kakao", "start", {mode: "login"}, undefined, "https://other.invalid")).status, 403);
  assert.equal((await easy("kakao", "start", {mode: "link"})).status, 401);

  const first = await start("kakao");
  const approval = grant("kakao", first);
  assert.equal((await easy("kakao", "complete", {...approval, proof: "1".repeat(64)})).status, 409);
  assert.equal((await easy("naver", "complete", approval)).status, 409);
  assert.equal((await easy("kakao", "complete", approval, undefined, "https://other.invalid")).status, 403);
  assert.equal((await easy("kakao", "signup", {...approval, account: accounts("reader")})).status, 409);
  checkKind(await easy("kakao", "complete", approval), 200, "signup");
  const registration = {...approval, account: accounts("reader")};
  process.env.PORTONE_IDENTITY_REQUIRED = "true";
  assert.equal((await easy("kakao", "signup", registration)).status, 422);
  assert.equal(await prisma.user.count({where: {email: registration.account.email}}), 0);
  process.env.PORTONE_IDENTITY_REQUIRED = "false";
  const registered = await easy("kakao", "signup", registration);
  checkKind(registered, 201, "session");
  const reader = registered.value.data;
  assert.equal(reader.user.role, "READER");
  assert.equal((await easy("kakao", "signup", registration)).status, 409);
  const wallet = await prisma.wallet.findUniqueOrThrow({where: {userId: reader.user.id}});
  const again = grant("kakao", await start("kakao"));
  const concurrent = await Promise.all([easy("kakao", "complete", again), easy("kakao", "complete", again)]);
  assert.deepEqual(concurrent.map(x => x.status).sort(), [200, 409]);
  const repeat = concurrent.find(x => x.status === 200)!;
  checkKind(repeat, 200, "session");
  assert.equal(repeat.value.data.user.id, reader.user.id);
  assert.equal((await prisma.wallet.findUniqueOrThrow({where: {userId: repeat.value.data.user.id}})).id, wallet.id);
  const invalidCode = await start("kakao");
  assert.equal((await easy("kakao", "complete", {...invalidCode, code: "invalid"})).status, 502);
  assert.equal((await easy("kakao", "complete", grant("kakao", invalidCode))).status, 409);
  const expired = await start("kakao");
  await prisma.easyLoginFlow.update({where: {id: expired.state}, data: {expiresAt: new Date(0)}});
  assert.equal((await easy("kakao", "complete", grant("kakao", expired))).status, 409);

  // An actual passkey-enrolled creator must keep their original identity, wallet and role.
  const keyOptions = (await request("passkeys/register/options", "POST", oldAccount)).value.data;
  const key = makeTestPasskey(new URL(site).hostname);
  const oldSignup = await request("passkeys/register/verify", "POST", {ceremonyId: keyOptions.ceremonyId,
    account: oldAccount, response: key.register(keyOptions.options.challenge, site)});
  assert.equal(oldSignup.status, 201);
  const old = oldSignup.value.data;
  await request("me/creator-mode", "POST", {}, old.token);
  const oldWallet = await prisma.wallet.update({where: {userId: old.user.id}, data: {balance: 73}});
  const unaffiliated = grant("naver", await start("naver"));
  checkKind(await easy("naver", "complete", unaffiliated), 200, "signup");
  assert.equal((await easy("naver", "signup", {...unaffiliated, account: {...accounts("second"), email: oldAccount.email}})).status, 409);
  assert.deepEqual((await request("easy/connections", "GET", undefined, old.token)).value.data.providers, []);
  const link = grant("naver", await start("naver", old.token));
  assert.equal((await easy("naver", "complete", link)).status, 409);
  assert.equal((await easy("naver", "complete", link, reader.token)).status, 409);
  checkKind(await easy("naver", "complete", link, old.token), 200, "linked");
  assert.equal((await easy("naver", "complete", link, old.token)).status, 409);
  const relogin = await easy("naver", "complete", grant("naver", await start("naver")));
  checkKind(relogin, 200, "session");
  assert.equal(relogin.value.data.user.id, old.user.id);
  assert.equal(relogin.value.data.user.role, "CREATOR");
  const savedWallet = await prisma.wallet.findUniqueOrThrow({where: {userId: relogin.value.data.user.id}});
  assert.equal(savedWallet.id, oldWallet.id);
  assert.equal(savedWallet.balance.toNumber(), 73);
  assert.equal((await easy("naver", "complete", grant("naver", await start("naver", reader.token)), reader.token)).status, 409);
  assert.equal((await easy("naver", "signup", {...unaffiliated, account: accounts("second")})).status, 409);
  assert.equal(await prisma.user.count({where: {username: accounts("second").username}}), 0);

  const pass = await start("pass", old.token);
  const verification = {state: pass.state, proof: pass.proof};
  for (const record of [{id: randomUUID()}, {status: "READY"}, {verifiedAt: new Date(0).toISOString()},
    {channel: {key: "fixture-identity", type: "TEST"}}, {channel: {key: "wrong-channel", type: "LIVE"}}]) {
    passRecord = record;
    assert.equal((await easy("pass", "complete", verification, old.token)).status, 409);
  }
  passRecord = {verifiedCustomer: {di: "not-a-ci", name: "Fixture"}};
  assert.equal((await easy("pass", "complete", verification, old.token)).status, 422);
  passRecord = {};
  checkKind(await easy("pass", "complete", verification, old.token), 200, "linked");
  const stored = await prisma.easyLoginIdentity.findUniqueOrThrow({where: {userId_provider: {userId: old.user.id, provider: "pass"}}});
  assert.match(stored.subjectHash, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(stored).includes(ci));
  assert.deepEqual((await request("easy/connections", "GET", undefined, old.token)).value.data.providers.sort(), ["naver", "pass"]);
  const passSession = await easy("pass", "complete", grant("pass", await start("pass")));
  checkKind(passSession, 200, "session");
  assert.equal(passSession.value.data.user.id, old.user.id);
  const changed = await start("pass");
  process.env.PORTONE_IDENTITY_CHANNEL_KEY = "other-channel";
  assert.equal((await easy("pass", "complete", changed)).status, 409);
  process.env.PORTONE_IDENTITY_CHANNEL_KEY = "fixture-identity";

  const pendingLink = grant("kakao", await start("kakao", old.token));
  assert.equal((await request("me", "DELETE", undefined, old.token)).status, 200);
  assert.equal((await request("me", "GET", undefined, passSession.value.data.token)).value.data, null);
  assert.equal(await prisma.easyLoginIdentity.count({where: {userId: old.user.id}}), 0);
  assert.equal((await easy("kakao", "complete", pendingLink, old.token)).status, 401);
  const freshPass = await start("pass");
  checkKind(await easy("pass", "complete", freshPass), 200, "signup");
  process.env.PORTONE_IDENTITY_REQUIRED = "true";
  const fresh = await easy("pass", "signup", {...freshPass, account: accounts("verified")});
  checkKind(fresh, 201, "session");
  const verifiedUser = await prisma.user.findUniqueOrThrow({where: {id: fresh.value.data.user.id}});
  assert.ok(verifiedUser.identityVerifiedAt);
  assert.equal(verifiedUser.identityVerificationLive, true);
  assert.notEqual(verifiedUser.id, old.user.id);
  const kakaoIdentity = await prisma.easyLoginIdentity.findUniqueOrThrow({where: {userId_provider: {userId: reader.user.id, provider: "kakao"}}});
  assert.equal(kakaoIdentity.kakaoUserId, kakaoAccountId);
  assert.equal((await request("me", "DELETE", undefined, reader.token)).status, 200);
  for (let i = 0; unlinkCalls === 0 && i < 20; i++) await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(unlinkCalls, 1);
  assert.ok(await prisma.kakaoUnlinkRequest.findUnique({where: {subjectHash: kakaoIdentity.subjectHash}}));
  assert.equal((await easy("kakao", "complete", grant("kakao", await start("kakao")))).status, 409);
  await prisma.kakaoUnlinkRequest.update({where: {subjectHash: kakaoIdentity.subjectHash}, data: {retryAt: new Date(0)}});
  unlinkResponds = true;
  await flushKakaoUnlinks();
  assert.equal(unlinkCalls, 2);
  assert.equal(await prisma.kakaoUnlinkRequest.count({where: {subjectHash: kakaoIdentity.subjectHash}}), 0);
  const passToken = fresh.value.data.token;
  checkKind(await easy("kakao", "complete", grant("kakao", await start("kakao", passToken)), passToken), 200, "linked");
  async function remoteUnlink(credential: string) {
    return (await fetch(base + "/api/auth/easy/kakao/unlink-callback", {method: "POST", headers: {Authorization: credential},
      body: new URLSearchParams({app_id: "10", user_id: kakaoAccountId, referrer_type: "UNLINK_FROM_APPS"})})).status;
  }
  assert.equal(await remoteUnlink("wrong"), 401);
  assert.equal(await remoteUnlink("KakaoAK fixture-admin-key"), 200);
  assert.equal(await remoteUnlink("KakaoAK fixture-admin-key"), 200);
  assert.equal((await request("me", "GET", undefined, passToken)).value.data, null);
  assert.equal(await prisma.easyLoginIdentity.count({where: {userId: verifiedUser.id, provider: "kakao"}}), 0);
  checkKind(await easy("pass", "complete", await start("pass")), 200, "session");
  console.log("Passed easy-login HTTP integration: OAuth/PASS, one-use proof, signup, wallet continuity, explicit linking, concurrent login, test/live isolation and deletion.");
} finally {
  globalThis.fetch = realFetch;
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  await prisma.$disconnect();
}
