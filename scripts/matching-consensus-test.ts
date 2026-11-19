import assert from "node:assert/strict";
import { MemberRole } from "@prisma/client";
import { rankMatchingCreators, resolveMatchingContext } from "../shared/creator-matching.js";
import { reviewMatchingShortlist } from "../src/services/matching-consensus.js";
import { __aiMatchingTestUtils } from "../src/services/ai-matching.service.js";
import type { MatchingProvider } from "../src/lib/matching-providers.js";

const creator = (id: string, name: string, role: MemberRole, skill: string) => ({
  id, userId: id, username: "user-" + id, displayName: name, isPartner: false, partnerTier: null,
  primaryRole: role, headline: skill, bio: "메일 test@example.invalid 전화 010-1234-5678", skills: [skill],
  availabilityNote: "PRIVATE_SCHEDULE", responseRate: 80, followerCount: 50, completedProjects: 5,
  featured: false, voiceDemo: null,
});
const profiles = [
  creator("private-001", "은결", "VOICE_ACTOR", "저음 연기 대본"),
  creator("private-002", "온별", "VOICE_ACTOR", "따뜻한 서정적인 목소리"),
  creator("private-003", "청아", "SOUND_DIRECTOR", "몽환적인 잔향 효과음"),
];
const input = { projectDescription: "PRIVATE_SCRIPT 몽환적인 성우 한 명만", messages: [{ role: "user" as const, content: "PRIVATE_HISTORY" }] };
const context = resolveMatchingContext(input);
const shortlist = rankMatchingCreators(profiles, { ...context, limit: 8 });
const baseline = rankMatchingCreators(profiles, context);
const providers: MatchingProvider[] = ["groq", "nvidia", "gemini"];
const all = () => providers;
const received: string[] = [];
const result = await reviewMatchingShortlist(context, [], shortlist, baseline, { providers: all,
  request: async (provider, _system, prompt) => {
    received.push(prompt);
    const request = JSON.parse(prompt);
    const picks = [...request.candidates].reverse().map(candidate => ({candidate: candidate.id, evidence: [candidate.evidence[0].id]}));
    if (provider === "gemini") picks[0].candidate = "invented";
    return {picks};
  },
});
assert.deepEqual(result.providersUsed, ["groq", "nvidia"]);
assert.deepEqual(result.providerIssues, {gemini: "invalid_response"});
assert.deepEqual(result.recommendations.map(item => item.creator.displayName), ["온별"]);
assert.ok(result.recommendations[0].reviewEvidence?.length);
assert.equal(result.recommendations[0].score, shortlist[1].score);
assert.equal(received.length, 3);
for (const prompt of received) {
  assert.doesNotMatch(prompt, /PRIVATE|private-|test@|010-|은결|온별|청아/);
  assert.match(prompt, /몽환/);
}

const failures = await reviewMatchingShortlist(context, [], shortlist, baseline, { providers: all,
  request: async provider => {
    if (provider === "groq") throw new Error("limited");
    if (provider === "gemini") return { picks: [{candidate: "C1", evidence: []}, {candidate: "C1", evidence: []}] };
    return { picks: [{candidate: "C1", evidence: ["made up"]}, {candidate: "C2", evidence: []}] };
  },
});
assert.deepEqual(failures, {recommendations: baseline, providersUsed: [], providerIssues: {groq: "unavailable", nvidia: "invalid_response", gemini: "invalid_response"}});
const mixed = resolveMatchingContext({ projectDescription: "성우와 사운드 디자이너 두 명, 몽환적인 분위기" });
const mixedRank = rankMatchingCreators(profiles, {...mixed, limit:8});
const team = await reviewMatchingShortlist(mixed, [], mixedRank, rankMatchingCreators(profiles, mixed), {providers: () => ["gemini"],
  request: async () => ({picks: ["C1","C2","C3"].map(candidate => ({candidate, evidence:["E1"]}))}),
});
assert.deepEqual(team.providersUsed, ["gemini"]);
assert.equal(new Set(team.recommendations.map(item => item.creator.primaryRole)).size, 2);
const chips = resolveMatchingContext({ projectDescription: "미스터리 웹툰 작업", preferredRoles: ["VOICE_ACTOR"] });
assert.deepEqual(rankMatchingCreators(profiles, chips).map(item => item.creator.primaryRole), ["VOICE_ACTOR", "VOICE_ACTOR"]);
const conflict = resolveMatchingContext({ projectDescription: "성우만 추천", preferredRoles: ["ILLUSTRATOR"] });
assert.deepEqual(rankMatchingCreators(profiles, conflict), []);

const previous = [{role:"user" as const, content:"성우 한 명 추천해줘"}, {role:"assistant" as const, content:"1순위. 온별님, 2순위. 은결님"}];
const chat = (question: string) => __aiMatchingTestUtils.buildReviewedResponse({projectDescription: question, messages: previous}, profiles, true);
const dm = await chat("2순위에게 보낼 DM 문구");
assert.equal(dm.recommendations[0].creator.displayName, "은결");
assert.ok(dm.assistantMessage.includes("은결"));
const compare = await chat("온별님과 은결님 비교해줘");
assert.deepEqual(compare.recommendations.map(item => item.creator.displayName), ["온별", "은결"]);
const payment = await chat("코인 환불을 어디서 문의해?");
assert.match(payment.assistantMessage, /고객센터/);
assert.deepEqual(payment.providersUsed, []);
const fees = await chat("정산 주기랑 수수료는?");
assert.match(fees.assistantMessage, /주 단위/);
assert.match(fees.assistantMessage, /13%/);
console.log("Matching consensus passed: grounded votes, exact IDs, privacy, partial/outage fallback, team diversity, hard filters and follow-up intent.");

// Exercise the studio's normal request path with all three HTTP boundaries replaced by fixtures.
const originalFetch = globalThis.fetch;
const savedEnv = new Map<string, string | undefined>();
const requestedHosts: string[] = [];
try {
  for (const provider of providers) {
    for (const [suffix, value] of Object.entries({API_KEY: "fixture", AI_ENABLED: "true", MIN_INTERVAL_MS: "0", DAILY_REQUEST_LIMIT: "10", MODEL: ""})) {
      const name = provider.toUpperCase() + "_" + suffix;
      savedEnv.set(name, process.env[name]);
      process.env[name] = value;
    }
  }
  globalThis.fetch = async (url, options) => {
    const host = new URL(String(url)).host;
    requestedHosts.push(host);
    const body = JSON.parse(String(options?.body));
    const gemini = host === "generativelanguage.googleapis.com";
    const prompt = JSON.parse(gemini ? body.contents[0].parts[0].text : body.messages[1].content);
    const picks = prompt.candidates.map((item: {id: string; evidence: {id:string}[]}) => ({candidate: item.id, evidence: item.evidence.slice(0, 1).map(entry => entry.id)}));
    const text = JSON.stringify({picks});
    await Promise.resolve();
    assert.equal(requestedHosts.length, 3);
    return Response.json(gemini ? {candidates: [{finishReason: "STOP", content: {parts:[{text}]}}]} : {choices:[{finish_reason:"stop", message:{content:text}}]});
  };
  const ensemble = await __aiMatchingTestUtils.buildReviewedResponse({projectDescription:"성우 한 명 추천해줘"}, profiles, true);
  assert.deepEqual(requestedHosts.sort(), ["api.groq.com", "generativelanguage.googleapis.com", "integrate.api.nvidia.com"]);
  assert.equal(ensemble.provider, "ensemble");
  assert.deepEqual(ensemble.providersUsed, providers);
  assert.deepEqual(ensemble.providerIssues, {});
  console.log("Studio matching passed parallel requests to all three provider adapters for a role-only project brief.");
} finally {
  globalThis.fetch = originalFetch;
  for (const [name, value] of savedEnv) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
