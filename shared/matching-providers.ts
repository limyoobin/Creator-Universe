export const matchingProviderIds = ["groq", "nvidia", "gemini"] as const;
export type MatchingProvider = typeof matchingProviderIds[number];
export type MatchingReviewIssue = "quota" | "credentials" | "unavailable" | "invalid_response";
export type MatchingProviderSetting = { provider: MatchingProvider; state: "missing_key" | "disabled" | "configured" };
export type MatchingProviderIssues = Partial<Record<MatchingProvider, MatchingReviewIssue>>;
