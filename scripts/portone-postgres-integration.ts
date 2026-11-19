import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

// Run migrations on a disposable local Postgres cluster using the cu_portone_qa
// DB user. Require an explicit test URL; ignore the application's DATABASE_URL.
const testDb = new URL(process.env.PORTONE_TEST_DATABASE_URL ?? "about:blank");
if (testDb.protocol !== "postgresql:" || testDb.hostname !== "127.0.0.1" || testDb.username !== "cu_portone_qa") {
  throw new Error("Set PORTONE_TEST_DATABASE_URL to the disposable local PostgreSQL cluster.");
}
Object.assign(process.env, {
  DATABASE_URL: testDb.href, PORTONE_MODE: "live", PORTONE_STORE_ID: "store-fixture",
  PORTONE_API_SECRET: "fixture", PORTONE_WEBHOOK_SECRET: "fixture", PORTONE_PAYMENT_CHANNEL_KEY: "card-fixture",
  PORTONE_IDENTITY_CHANNEL_KEY: "identity-fixture", PORTONE_IDENTITY_REQUIRED: "true",
});
const { prisma } = await import("../src/lib/prisma.js");
const { signup } = await import("../src/services/auth.service.js");
const { default: app } = await import("../src/app.js");
const { reconcileTopUp } = await import("../src/services/wallet-topup.service.js");
async function historicalOrder(userId: string, live: boolean) {
  const order = await prisma.walletTopUpOrder.create({ data: {
    id: "cu-" + randomUUID().replaceAll("-", ""), userId, productId: "coin-1000", coins: 1000, amountKrw: 1000,
    storeId: "store-fixture", channelKey: "card-fixture", live,
  } });
  return {paymentId: order.id, storeId: order.storeId, channelKey: order.channelKey, totalAmount: order.amountKrw};
}
const { settleContentPurchase, purchasedLibrary, saleCatalog, purchasedAudio } = await import("../src/services/settlement.service.js");
const { AppError } = await import("../src/errors/app-error.js");
const records = new Map<string, unknown>();
const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://api.portone.io");
  assert.equal(url.searchParams.get("storeId"), "store-fixture");
  return records.has(url.pathname) ? Response.json(records.get(url.pathname)) : new Response("", { status: 404 });
};
const rejected = (code: number) => (err: unknown) => err instanceof AppError && err.statusCode === code;

try {
  const tag = randomUUID().slice(0, 8);
  const member = await signup({username: "test_" + tag, email: tag + "@example.invalid", displayName: "test_" + tag, password: "local-qa!" + tag});
  const userId = member.user.id;
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>(resolve => server.once("listening", resolve));
    const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
    const status = await originalFetch(base + "/api/integrations/portone");
    assert.equal((await status.json()).data.paymentReady, false);
    for (const path of ["/api/users/me/wallet/charge", "/api/users/me/wallet/orders"]) {
      const response = await originalFetch(base + path, {
        method: "POST", headers: {Authorization: "Bearer " + member.token, "Content-Type": "application/json"},
        body: JSON.stringify({productId: "coin-1000", coinAmount: 1000}),
      });
      assert.equal(response.status, 410);
    }
    assert.equal(await prisma.walletTopUpOrder.count({where: {userId}}), 0);
    assert.equal(Number((await prisma.wallet.findUniqueOrThrow({where: {userId}})).balance), 0);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }

  const order = await historicalOrder(userId, true);
  const paymentPath = "/payments/" + order.paymentId;
  const paid = { id: order.paymentId, status: "PAID", storeId: order.storeId, channel: { key: order.channelKey, type: "LIVE" },
    paidAt: new Date().toISOString(), customer: {id: userId}, method: {type: "PaymentMethodCard"}, currency: "KRW",
    amount: { total: order.totalAmount, cancelled: 0 } };
  const balance = async () => Number((await prisma.wallet.findUniqueOrThrow({ where: {userId} })).balance);
  const retries = () => Promise.all(Array.from({length: 8}, (_, i) => reconcileTopUp(order.paymentId, i % 2 ? userId : undefined)));
  const opening = await balance();
  records.set(paymentPath, { ...paid, amount: { total: order.totalAmount - 1, cancelled: 0 } });
  await assert.rejects(reconcileTopUp(order.paymentId, userId), rejected(409));
  assert.equal(await balance(), opening);
  await assert.rejects(reconcileTopUp(order.paymentId, "different-user"), rejected(404));
  records.set(paymentPath, paid);
  await retries();
  assert.equal(await balance(), opening + 1000);
  records.delete(paymentPath);
  await assert.rejects(
    reconcileTopUp(order.paymentId, undefined, { type: "Transaction.Cancelled" }),
    rejected(503),
  );
  assert.equal(await balance(), opening + 1000);
  records.set(paymentPath, { ...paid, status: "PARTIAL_CANCELLED", amount: {total: 1000, cancelled: 400} });
  await retries();
  assert.equal(await balance(), opening + 600);
  records.set(paymentPath, paid);
  await retries();
  assert.equal(await balance(), opening + 600);
  records.set(paymentPath, { ...paid, status: "CANCELLED", amount: {total: 1000, cancelled: 1000} });
  await retries();
  assert.equal(await balance(), opening);

  process.env.PORTONE_MODE = "test";
  const testOrder = await historicalOrder(userId, false);
  records.set("/payments/" + testOrder.paymentId, { ...paid, id: testOrder.paymentId, channel: {key: testOrder.channelKey, type: "TEST"} });
  await reconcileTopUp(testOrder.paymentId, userId);
  assert.equal(await balance(), opening);

  const author = await prisma.user.create({data: {
    email: "creator-" + randomUUID() + "@example.invalid", username: "creator_" + randomUUID().slice(0, 8),
    displayName: "QA author", role: "CREATOR",
  }});
  const project = await prisma.project.create({data: {
    id: "project-midnight-signal", title: "QA work", slug: "qa-work", ownerId: author.id, status: "PUBLISHED",
    priceCoins: 350, platformFeeRate: 0.1, partnerFeeRate: 0.05,
    members: {create: { userId: author.id, memberRole: "WRITER", sharePercentage: 100 }},
  }});
  const workId = "midnight-signal";
  const purchase = { buyerId: userId, workId, coinAmount: project.priceCoins };
  assert.equal(project.storefrontSalesEnabled, false);
  await prisma.project.update({where: {id: project.id}, data: {storefrontSalesEnabled: true}});
  assert.deepEqual((await saleCatalog()).works, []);
  await assert.rejects(settleContentPurchase(purchase), rejected(409));
  await assert.rejects(purchasedAudio(userId, workId), rejected(403));
  await prisma.project.update({where: {id: project.id}, data: {storefrontSalesEnabled: false}});
  await prisma.projectEpisode.createMany({data: [
    {projectId: project.id, title: "Third", slug: "qa-3", sequenceNumber: 3, durationSeconds: 60,
      isPublished: true, audioUrl: "https://qa-media.invalid/episode3.mp3"},
    {projectId: project.id, title: "Preview", slug: "qa-1", sequenceNumber: 1, durationSeconds: 60,
      isPublished: true, audioUrl: "https://qa-media.invalid/preview.mp3"},
    {projectId: project.id, title: "Draft", slug: "qa-4", sequenceNumber: 4, durationSeconds: 60,
      isPublished: false, audioUrl: "https://qa-media.invalid/episode4.mp3"},
    {projectId: project.id, title: "Placeholder", slug: "qa-5", sequenceNumber: 5, durationSeconds: 60,
      isPublished: true, audioUrl: "https://cdn.example.com/placeholder.mp3"},
  ]});
  await prisma.projectEpisode.create({data: {
    projectId: project.id, title: "Episode two", slug: "qa-episode-two", isPublished: true,
    audioUrl: "https://qa-media.invalid/episode2.mp3", sequenceNumber: 2, durationSeconds: 60,
    transcriptCues: {create: [
      {startMs: 5000, endMs: 8000, text: "Second"}, {startMs: 0, endMs: 4000, text: "First"},
    ]},
  }});
  assert.deepEqual((await saleCatalog()).works, []);
  await assert.rejects(settleContentPurchase(purchase), rejected(409));
  await assert.rejects(settleContentPurchase({buyerId: userId, projectId: project.id, coinAmount: project.priceCoins}), rejected(409));
  await prisma.project.update({where: {id: project.id}, data: {storefrontSalesEnabled: true}});
  assert.deepEqual((await saleCatalog()).works, [{workId, priceCoins: project.priceCoins}]);
  await prisma.wallet.update({where: {userId}, data: {balance: 0}});
  await assert.rejects(settleContentPurchase(purchase), rejected(402));
  await prisma.wallet.update({where: {userId}, data: {balance: 1000}});
  await assert.rejects(settleContentPurchase({...purchase, coinAmount: 1}), rejected(409));
  // Fill the fixture's revenue column so that the final update fails after the
  // debit, payout and grant. Verify the database rolled all of them back.
  await prisma.project.update({where: {id: project.id}, data: {totalRevenueAmount: "999999999999.99"}});
  await assert.rejects(settleContentPurchase(purchase), (err: unknown) =>
    err instanceof Error && /overflow|out of range/i.test(err.message));
  assert.equal(await balance(), 1000);
  assert.deepEqual((await purchasedLibrary(userId)).workIds, []);
  assert.equal(await prisma.wallet.count({where: {userId: author.id}}), 0);
  assert.equal(await prisma.transaction.count({where: {buyerId: userId, projectId: project.id}}), 0);
  assert.equal(await prisma.settlementDistribution.count({where: {projectId: project.id}}), 0);
  await prisma.project.update({where: {id: project.id}, data: {totalRevenueAmount: 0}});
  const purchases = await Promise.all(Array.from({length: 8}, () => settleContentPurchase(purchase)));
  assert.equal(purchases.filter(result => !result.alreadyPurchased).length, 1);
  assert.equal(new Set(purchases.map(result => result.transactionId)).size, 1);
  assert.equal(await balance(), 650);
  assert.deepEqual((await purchasedLibrary(userId)).workIds, [workId]);
  const sale = await prisma.transaction.findFirstOrThrow({ where: { buyerId: userId, projectId: project.id } });
  assert.equal(Number(sale.grossAmount), 350);
  assert.equal(await prisma.settlementDistribution.count({where: {transactionId: sale.id}}), 1);
  const payout = await prisma.wallet.findUniqueOrThrow({where: {userId: author.id}});
  assert.equal(Number(payout.balance), Number(sale.netAmount));
  await assert.rejects(purchasedAudio(author.id, workId), rejected(403));
  const { episodes } = await purchasedAudio(userId, workId);
  assert.deepEqual(episodes.map(episode => [episode.sequenceNumber, episode.audioUrl]), [
    [2, "https://qa-media.invalid/episode2.mp3"], [3, "https://qa-media.invalid/episode3.mp3"],
  ]);
  assert.deepEqual(episodes[0].transcriptCues.map(cue => cue.text), ["First", "Second"]);
  console.log("PostgreSQL integration passed: new charges disabled, historical approvals and refunds, test payment isolation, server-priced purchases, rollback and buyer-only published audio.");
} finally {
  globalThis.fetch = originalFetch;
  await prisma.$disconnect();
}
