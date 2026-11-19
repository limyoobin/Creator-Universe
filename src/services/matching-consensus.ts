import { matchingReviewTags, type MatchableCreator, type MatchingContext } from "../../shared/creator-matching.js";
import { configuredMatchingProviders, requestMatchingJson, type MatchingProvider } from "../lib/matching-providers.js";

type RankedProfile = { creator: MatchableCreator; score: number; rank: number; matchedKeywords: string[] };
type Evidence = { id: string; tag: string };
type Candidate = { id: string; role: string; evidence: Evidence[] };
type Pick = { candidate: string; evidence: string[] };
type Review = { provider: MatchingProvider; picks: Pick[] };
const instructions = [
  "You are reviewing a shortlist for a creative collaboration. Return only a JSON object.",
  'Schema: {"picks":[{"candidate":"C1","evidence":["E1"]}]}.',
  "Include every supplied candidate exactly once in descending order of creative fit. Break ties by the compatibility of the medium, genre, style and production skills.",
  "For each candidate select up to two of that candidate's own evidence IDs most relevant to the request. An empty evidence list is valid if nothing is relevant.",
  "Use only supplied IDs. Omit prose and new fields. Candidate order in the input has no significance.",
].join("\n");

function validatePicks(value: unknown, candidates: Candidate[]): Pick[] | null {
  if (!value || typeof value !== "object" || !("picks" in value) || !Array.isArray(value.picks) || value.picks.length !== candidates.length) return null;
  const seen = new Set<string>();
  const picks: Pick[] = [];
  for (const item of value.picks) {
    const candidate = candidates.find(candidate => item?.candidate === candidate.id);
    if (!candidate || seen.has(candidate.id) || !Array.isArray(item.evidence) || item.evidence.length > 2) return null;
    const evidence: unknown[] = item.evidence;
    if (!evidence.every((id): id is string => typeof id === "string" && candidate.evidence.some(entry => entry.id === id)) || new Set(evidence).size !== evidence.length) return null;
    seen.add(candidate.id);
    picks.push({ candidate: candidate.id, evidence });
  }
  return picks.some(pick => pick.evidence.length) ? picks : null;
}

function evidenceFor(profile: RankedProfile, terms: Set<string>) {
  const creator = profile.creator;
  const tags = matchingReviewTags([creator.headline, creator.bio, ...creator.skills, creator.voiceDemo?.title ?? ""].join(" "));
  // Keep direct matches when long profiles exhaust the prompt's evidence budget.
  return tags.sort((a, b) => Number(terms.has(b)) - Number(terms.has(a))).slice(0, 10)
    .map((tag, index) => ({ id: "E" + (index + 1), tag }));
}

type ReviewClient = {
  providers: () => MatchingProvider[];
  request: typeof requestMatchingJson;
};
const defaultClient: ReviewClient = { providers: configuredMatchingProviders, request: requestMatchingJson };

export async function reviewMatchingShortlist<T extends RankedProfile>(
  context: MatchingContext, genres: string[], shortlist: T[], baseline: T[], client: ReviewClient = defaultClient,
): Promise<{ recommendations: (T & { reviewEvidence?: string[] })[]; providersUsed: MatchingProvider[] }> {
  const local = { recommendations: baseline, providersUsed: [] };
  const providers = client.providers();
  if (!providers.length || !shortlist.length) return local;
  const work = matchingReviewTags([context.source, ...genres].join(" ")).slice(0, 30);
  // A role filter alone provides no useful basis for an external semantic review.
  if (!work.length) return local;
  const terms = new Set(work);
  const candidates = shortlist.map((item, index) => ({
    id: "C" + (index + 1), role: item.creator.primaryRole, evidence: evidenceFor(item, terms),
  }));
  if (!candidates.some(candidate => candidate.evidence.length)) return local;
  const prompt = JSON.stringify({ brief: { roles: context.roles, work }, candidates });
  const responses = await Promise.allSettled(providers.map(async provider => {
    const picks = validatePicks(await client.request(provider, instructions, prompt), candidates);
    return picks ? { provider, picks } : null;
  }));
  const reviews: Review[] = [];
  for (const response of responses) if (response.status === "fulfilled" && response.value) reviews.push(response.value);
  if (!reviews.length) return local;

  const reviewed = shortlist.map((item, index) => {
    const candidate = candidates[index];
    const votes = new Map<string, number>();
    let rankVotes = 0;
    for (const { picks } of reviews) {
      const position = picks.findIndex(pick => pick.candidate === candidate.id);
      rankVotes += (shortlist.length - 1 - position) / Math.max(1, shortlist.length - 1);
      for (const id of picks[position].evidence) votes.set(id, (votes.get(id) ?? 0) + 1);
    }
    // A model can break a near tie but never override a strong documented fit.
    // The public score continues to equal the sum of the displayed local signals.
    const reviewEvidence = candidate.evidence.filter(entry => votes.has(entry.id))
      .sort((a, b) => votes.get(b.id)! - votes.get(a.id)!).slice(0, 2).map(entry => entry.tag);
    const order = item.score + (reviewEvidence.length ? 7 * rankVotes / reviews.length : 0);
    return { item: { ...item, reviewEvidence }, order, index };
  }).sort((a, b) => b.order - a.order || a.index - b.index);

  const selected = new Set<string>();
  if (context.limit >= context.roles.length) {
    for (const role of context.roles) {
      const member = reviewed.find(entry => entry.item.creator.primaryRole === role);
      if (member) selected.add(member.item.creator.userId);
    }
  }
  for (const entry of reviewed) {
    if (selected.size >= context.limit) break;
    selected.add(entry.item.creator.userId);
  }
  return {
    recommendations: reviewed.filter(entry => selected.has(entry.item.creator.userId)).map(({ item }, i) => ({ ...item, rank: i + 1 })),
    providersUsed: reviews.map(review => review.provider),
  };
}
