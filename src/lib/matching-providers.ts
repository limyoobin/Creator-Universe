const providerNames = ["groq", "nvidia", "gemini"] as const;
export type MatchingProvider = typeof providerNames[number];

const defaultModels: Record<MatchingProvider, string> = {
  groq: "openai/gpt-oss-20b",
  nvidia: "nvidia/nemotron-3.5-lightning-30b-a3b",
  gemini: "gemini-3.5-flash-lite",
};

// Preserve the existing free-tier model policy when operators upgrade the server.
// A model allowlist cannot determine the billing tier of an API key.
const geminiFreeModels = new Set([
  defaultModels.gemini, "gemini-3.5-flash", "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview", "gemini-2.5-flash-lite", "gemini-2.5-flash",
  "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-flash-latest",
]);

function enabled(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw ? ["true", "1", "yes", "on"].includes(raw) : fallback;
}

function limit(name: string, fallback: number, maximum: number, minimum = 1) {
  const raw = process.env[name]?.trim();
  const value = Number(raw);
  return raw && Number.isSafeInteger(value) && value >= minimum ? Math.min(value, maximum) : fallback;
}

function configuration(provider: MatchingProvider) {
  const prefix = provider.toUpperCase();
  const key = process.env[prefix + "_API_KEY"]?.trim();
  const model = process.env[prefix + "_MODEL"]?.trim() || defaultModels[provider];
  if (!key || !enabled(prefix + "_AI_ENABLED", true)) return null;
  if (provider === "gemini" && enabled("GEMINI_FREE_ONLY", true) && !geminiFreeModels.has(model)) return null;
  return {
    key, model,
    dailyLimit: limit(prefix + "_DAILY_REQUEST_LIMIT", 40, 100_000, 0),
    minIntervalMs: limit(prefix + "_MIN_INTERVAL_MS", 1500, 86_400_000, 0),
    timeoutMs: limit(prefix + "_TIMEOUT_MS", 7000, 8000),
    maxInputChars: limit(prefix + "_MAX_INPUT_CHARS", 5200, 16_000),
    maxOutputTokens: limit(prefix + "_MAX_OUTPUT_TOKENS", 650, 2048),
  };
}

export function configuredMatchingProviders(): MatchingProvider[] {
  return providerNames.filter(provider => configuration(provider));
}

type Budget = { day: string; count: number; nextAt: number };
const budgets = new Map<MatchingProvider, Budget>();

// Reserve synchronously before fetch. Parallel browser requests share each provider's budget.
function reserve(provider: MatchingProvider, dailyLimit: number, minIntervalMs: number) {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const budget = budgets.get(provider) ?? { day, count: 0, nextAt: 0 };
  if (budget.day !== day) { budget.day = day; budget.count = 0; }
  if (budget.count >= dailyLimit || now < budget.nextAt) throw new Error("Matching provider rate limited");
  budget.count += 1;
  budget.nextAt = now + minIntervalMs;
  budgets.set(provider, budget);
  return budget;
}

function pauseAfterRateLimit(budget: Budget, header: string | null) {
  const now = Date.now();
  const seconds = header && /^\d+$/.test(header) ? Number(header) : NaN;
  const nextAt = Number.isFinite(seconds) ? now + seconds * 1000 : Date.parse(header ?? "");
  budget.nextAt = Math.max(budget.nextAt, Number.isFinite(nextAt) ? nextAt : now + 60_000);
}

type GeminiResponse = {
  candidates?: { finishReason?: string; content?: {parts?: {text?: string; thought?: boolean}[]} }[];
};
type ChatResponse = {
  choices?: { finish_reason?: string; message?: { content?: string } }[];
};

function completionText(provider: MatchingProvider, payload: unknown) {
  if (provider === "gemini") {
    const candidate = (payload as GeminiResponse)?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") return "";
    return candidate?.content?.parts?.filter(part => !part.thought && typeof part.text === "string").map(part => part.text).join("") ?? "";
  }
  const choice = (payload as ChatResponse)?.choices?.[0];
  if (choice?.finish_reason && choice.finish_reason !== "stop") return "";
  return choice?.message?.content ?? "";
}

// Callers pass the public, pseudonymous matching brief. This module never reads user/profile data.
export async function requestMatchingJson(provider: MatchingProvider, systemInstruction: string, userPrompt: string): Promise<unknown> {
  const config = configuration(provider);
  if (!config) throw new Error("Matching provider unavailable");
  if (!userPrompt || userPrompt.length > config.maxInputChars || systemInstruction.length > 4096) {
    throw new Error("Matching prompt outside input limits");
  }
  const budget = reserve(provider, config.dailyLimit, config.minIntervalMs);
  let url: string;
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  let body: object;
  if (provider === "gemini") {
    url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(config.model) + ":generateContent";
    headers["x-goog-api-key"] = config.key;
    body = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: config.maxOutputTokens },
    };
  } else {
    const isGroq = provider === "groq";
    url = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://integrate.api.nvidia.com/v1/chat/completions";
    headers.Authorization = "Bearer " + config.key;
    body = {
      model: config.model,
      messages: [{ role: "system", content: systemInstruction }, { role: "user", content: userPrompt }],
      stream: false,
      ...(isGroq ? { max_completion_tokens: config.maxOutputTokens, response_format: { type: "json_object" } } : { max_tokens: config.maxOutputTokens }),
      ...(isGroq && config.model.startsWith("openai/gpt-oss-") && { reasoning_effort: "low" }),
      ...(provider === "nvidia" && config.model === defaultModels.nvidia && { chat_template_kwargs: { enable_thinking: false } }),
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST", redirect: "error", headers, body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!response.ok) {
      if (response.status === 429) pauseAfterRateLimit(budget, response.headers.get("retry-after"));
      await response.body?.cancel();
      throw new Error();
    }
    const text = completionText(provider, await response.json()).trim();
    const fenced = /^\x60{3}(?:json)?\s*([\s\S]*?)\s*\x60{3}$/i.exec(text);
    return JSON.parse(fenced?.[1] ?? text) as unknown;
  } catch {
    // Provider bodies/errors can echo the matching brief or credentials. Keep them off the response and logs.
    throw new Error("Matching provider did not return a complete JSON response");
  }
}
