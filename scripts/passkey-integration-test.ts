import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { makeTestPasskey } from "./passkey-test-fixture.js";

const testDb = new URL(process.env.PORTONE_TEST_DATABASE_URL ?? "about:blank");
if (testDb.protocol !== "postgresql:" || testDb.hostname !== "127.0.0.1" || testDb.username !== "cu_portone_qa") {
  throw new Error("Set PORTONE_TEST_DATABASE_URL to the disposable local PostgreSQL cluster.");
}
// Verify the production policy through a loopback HTTP server. All provider I/O
// is disabled. The Origin header identifies the RP but no request is sent there.
const site = "https://project-limyoobins-projects.vercel.app";
Object.assign(process.env, {DATABASE_URL:testDb.href, NODE_ENV:"production", PORTONE_MODE:"", PORTONE_IDENTITY_REQUIRED:"false",
  GEMINI_AI_ENABLED:"false", GROQ_AI_ENABLED:"false", NVIDIA_AI_ENABLED:"false"});
const { default: app } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { hashPassword } = await import("../src/utils/auth.js");
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
async function request(path: string, method: string, body?: unknown, token?: string, origin = site) {
  const response = await fetch(base + path, {method, headers: {"Content-Type":"application/json", Origin:origin,
    ...(token ? {Authorization:"Bearer " + token} : {})}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
  return {status:response.status, value:await response.json()};
}
const passkey = (path: string, body: unknown) => request("/api/auth/passkeys/" + path, "POST", body);
const account = () => { const name = "k_" + randomUUID().slice(0, 8); return {username:name, email:name+"@example.invalid", displayName:name}; };
const rpId = new URL(site).hostname;
try {
  const who = account();
  const key = makeTestPasskey(rpId);
  assert.equal((await request("/api/auth/signup", "POST", who)).status, 410);
  assert.equal((await request("/api/auth/passkeys/register/options", "POST", who, undefined, "https://fixture.invalid")).status, 403);
  const started = await passkey("register/options", who);
  assert.equal(started.status, 200);
  const {ceremonyId, options} = started.value.data;
  assert.equal(options.rp.id, rpId);
  assert.equal(options.authenticatorSelection.userVerification, "required");
  assert.equal(options.authenticatorSelection.residentKey, "required");
  const handle = options.user.id;
  const enrollment = {ceremonyId, account:who, response:key.register(options.challenge,site)};
  assert.equal((await passkey("register/verify", {...enrollment,account:{...who, email:"changed@example.invalid"}})).status, 401);
  assert.equal((await passkey("register/verify", {...enrollment,response:key.register(options.challenge,"https://fixture.invalid")})).status, 401);
  assert.equal((await passkey("register/verify", {...enrollment,response:key.register(options.challenge,site,false)})).status, 401);
  assert.equal(await prisma.user.count({where:{username:who.username}}), 0);
  const registered = await passkey("register/verify", enrollment);
  assert.equal(registered.status, 201);
  const {user, token} = registered.value.data;
  assert.equal((await prisma.user.findUniqueOrThrow({where:{id:user.id}})).passwordHash, null);
  assert.equal(user.role, "READER");
  assert.equal((await passkey("register/verify", enrollment)).status, 401);
  assert.equal((await request("/api/auth/me", "GET", undefined, token)).value.data.username, who.username);
  assert.equal((await request("/api/auth/logout", "POST", {}, token)).status, 200);
  assert.equal((await request("/api/auth/me", "GET", undefined, token)).value.data, null);

  const login = async () => {
    const start = await passkey("login/options", {});
    assert.equal(start.status, 200);
    assert.equal(start.value.data.options.userVerification,"required");
    return start.value.data;
  };
  const checking = await login();
  const assertion = { ceremonyId:checking.ceremonyId, response:key.authenticate(checking.options.challenge,handle,1,site) };
  assert.equal((await passkey("login/verify",{...assertion,response:key.authenticate(checking.options.challenge,handle,1,site,false)})).status,401);
  assert.equal((await passkey("login/verify",{...assertion,response:key.authenticate(checking.options.challenge,handle,1,"https://fixture.invalid")})).status,401);
  const simultaneous = await Promise.all([passkey("login/verify",assertion),passkey("login/verify",assertion)]);
  assert.deepEqual(simultaneous.map(item=>item.status).sort(), [200,401]);
  const signedIn = simultaneous.find(item=>item.status === 200)!.value.data;
  assert.equal(signedIn.user.id, user.id);
  assert.equal((await passkey("login/verify",assertion)).status,401);
  assert.equal((await request("/api/auth/me","DELETE",undefined,signedIn.token)).status,200);
  assert.equal((await request("/api/auth/me","GET",undefined,signedIn.token)).value.data,null);
  assert.equal(await prisma.passkeyCredential.count({where:{userId:user.id}}),0);
  const removed = await login();
  assert.equal((await passkey("login/verify",{ceremonyId:removed.ceremonyId,response:key.authenticate(removed.options.challenge,handle,2,site)})).status,401);

  const existing = account();
  const password = "Local!test_" + randomUUID();
  await prisma.user.create({data:{...existing, role:"CREATOR", passwordHash:await hashPassword(password), wallet:{create:{}},
    creatorProfile:{create:{primaryRole:"VOICE_ACTOR", headline:"미스터리 저음", bio:"오디오드라마", skills:["성우"]}}}});
  const passwordLogin = await request("/api/auth/login","POST",{username:existing.username,password});
  assert.equal(passwordLogin.status,200);
  assert.equal(passwordLogin.value.data.user.role,"CREATOR");
  for (const route of ["matching-chat","matching-recommendations"]) {
    const result = await request("/api/ai/"+route,"POST",{projectDescription:"미스터리 오디오드라마 성우 한 명만 추천해줘"});
    assert.equal(result.status,200);
    assert.equal(result.value.data.provider,"local");
    assert.deepEqual(result.value.data.providersUsed,[]);
    assert.ok(result.value.data.recommendations.some((item: {creator:{primaryRole:string}})=>item.creator.primaryRole === "VOICE_ACTOR"));
  }
  console.log("PostgreSQL HTTP checks passed: passkey registration/login, origin, user verification, replay, logout, deletion, legacy password login and both matching endpoints.");
} finally {
  await new Promise<void>((resolve,reject)=>server.close(err=>err ? reject(err) : resolve()));
  await prisma.$disconnect();
}
