import assert from "node:assert/strict";
import { configuredMatchingProviders, matchingProviderSettings, MatchingProviderError, requestMatchingJson, type MatchingProvider } from "../src/lib/matching-providers.js";

const providers: MatchingProvider[] = ["groq", "nvidia", "gemini"];
for (const provider of providers) {
  const prefix = provider.toUpperCase();
  for (const suffix of ["API_KEY", "AI_ENABLED", "MODEL", "DAILY_REQUEST_LIMIT", "MIN_INTERVAL_MS", "MAX_INPUT_CHARS"]) {
    delete process.env[prefix + "_" + suffix];
  }
}
process.env.GEMINI_FREE_ONLY = "true";
const fixtureVote = { picks: [{candidate: "C1", evidence: ["E1"]}] };
const system = "Return JSON with only listed candidates and evidence.";
const input = JSON.stringify({candidates: [{id: "C1", evidence: ["E1"]}]});
const fetchOriginal = globalThis.fetch;
const requests: {url: URL; headers: Headers; body: Record<string, any>}[] = [];
let answer: Response;
globalThis.fetch = async (request, options) => {
  assert.equal(options?.redirect, "error");
  assert.ok(options?.signal instanceof AbortSignal);
  assert.equal(options?.method, "POST");
  requests.push({url: new URL(String(request)), headers: new Headers(options.headers), body: JSON.parse(String(options.body))});
  return answer;
};

try {
  assert.deepEqual(configuredMatchingProviders(), []);
  assert.deepEqual(matchingProviderSettings(), providers.map(provider => ({provider, state: "missing_key"})));
  await assert.rejects(requestMatchingJson("groq", system, input));
  assert.equal(requests.length, 0);
  for (const provider of providers) {
    process.env[provider.toUpperCase() + "_API_KEY"] = "fixture-key-" + provider;
    process.env[provider.toUpperCase() + "_MIN_INTERVAL_MS"] = "0";
    process.env[provider.toUpperCase() + "_DAILY_REQUEST_LIMIT"] = "10";
  }
  assert.deepEqual(configuredMatchingProviders(), providers);
  assert.deepEqual(matchingProviderSettings(), providers.map(provider => ({provider, state: "configured"})));
  process.env.NVIDIA_DAILY_REQUEST_LIMIT = "0";
  assert.equal(matchingProviderSettings().find(item => item.provider === "nvidia")?.state, "disabled");
  process.env.NVIDIA_DAILY_REQUEST_LIMIT = "10";
  process.env.GEMINI_MODEL = "unknown-paid-model";
  assert.equal(configuredMatchingProviders().includes("gemini"), false);
  assert.equal(matchingProviderSettings().find(item => item.provider === "gemini")?.state, "disabled");
  delete process.env.GEMINI_MODEL;

  for (const provider of providers) {
    answer = Response.json(provider === "gemini"
      ? { candidates: [{ finishReason: "STOP", content: {parts: [
          {thought: true, text: "unexposed provider thought"}, {text: JSON.stringify(fixtureVote)},
        ]} }] }
      : { choices: [{ finish_reason: "stop", message: {content: JSON.stringify(fixtureVote)} }] });
    assert.deepEqual(await requestMatchingJson(provider, system, input), fixtureVote);
    const { url, headers, body } = requests.at(-1)!;
    assert.equal(url.search, "");
    assert.ok(!JSON.stringify(body).includes("fixture-key"));
    if (provider === "gemini") {
      assert.equal(url.host, "generativelanguage.googleapis.com");
      assert.equal(headers.get("x-goog-api-key"), "fixture-key-gemini");
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.equal(body.contents[0].parts[0].text, input);
    } else {
      assert.equal(url.host, provider === "groq" ? "api.groq.com" : "integrate.api.nvidia.com");
      assert.equal(headers.get("authorization"), "Bearer fixture-key-" + provider);
      assert.equal(body.messages[1].content, input);
      assert.equal(body.stream, false);
    }
  }
  const calls = requests.length;
  process.env.GROQ_DAILY_REQUEST_LIMIT = "1";
  await assert.rejects(requestMatchingJson("groq", system, input));
  await assert.rejects(requestMatchingJson("nvidia", system, "X".repeat(9000)));
  assert.equal(requests.length, calls);
  answer = Response.json({candidates: [{finishReason: "MAX_TOKENS", content: {parts: [{text: "{}"}]}}]});
  await assert.rejects(requestMatchingJson("gemini", system, input));
  answer = Response.json({choices: [{message: {content: "fixture-key-nvidia"}}]});
  await assert.rejects(requestMatchingJson("nvidia", system, input), error => String(error).includes("complete JSON") && !String(error).includes("fixture-key"));
  answer = new Response("provider echoed private payload", {status: 403});
  await assert.rejects(requestMatchingJson("nvidia", system, input), error => error instanceof MatchingProviderError && error.issue === "credentials" && !error.message.includes("private"));
  answer = new Response("provider echoed private payload", {status: 429, headers: {"retry-after": "2"}});
  await assert.rejects(requestMatchingJson("nvidia", system, input), error => error instanceof MatchingProviderError && error.issue === "quota");
  const after429 = requests.length;
  await assert.rejects(requestMatchingJson("nvidia", system, input));
  assert.equal(requests.length, after429);
  console.log("Matching provider adapters passed request, response, credential and request-limit checks.");
} finally {
  globalThis.fetch = fetchOriginal;
}
