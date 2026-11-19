import { rankMatchingCreators, resolveMatchingContext, type MatchableCreator } from "../shared/creator-matching.js";

// A fixture is a fictional commission history. Labels are kept outside the
// public profile passed to the ranker so the evaluation cannot read its answers.
const roles = [
  { id: "WRITER", title: "글 작가" },
  { id: "ILLUSTRATOR", title: "일러스트레이터" },
  { id: "VOICE_ACTOR", title: "성우" },
  { id: "SOUND_DIRECTOR", title: "작곡가" },
];
const genres = [
  { label: "미스터리", alias: "추리", premise: "사건의 범인을 찾는 이야기" },
  { label: "판타지", alias: "이세계", premise: "용이 왕국을 지키는 이야기" },
  { label: "로맨스", alias: "연애", premise: "헤어진 두 사람이 다시 만나는 이야기" },
];

const profiles: MatchableCreator[] = [];
const labels = new Map<string, string>();
for (const [roleIndex, role] of roles.entries()) {
  for (const [genreIndex, genre] of genres.entries()) {
    for (const [variant, evidence] of [genre.label, genre.premise].entries()) {
      const id = `fixture-${roleIndex}-${genreIndex}-${variant}`;
      profiles.push({
        userId: id,
        displayName: id,
        primaryRole: role.id,
        headline: `${role.title} 포트폴리오`,
        bio: `최근 작업: ${evidence}`,
        skills: [],
        // Rotate the most active genre across roles to prevent one genre always winning ties.
        responseRate: 60 + 10 * ((genreIndex + roleIndex) % genres.length) + variant,
        completedProjects: 1 + 5 * ((genreIndex + roleIndex) % genres.length) + variant,
      });
      labels.set(id, genre.label);
    }
  }
}

type Observation = {
  wording: string;
  query: string;
  expectedRole: string;
  expectedGenre: string;
  selectedId: string | null;
  selectedRole: string | null;
  selectedGenre: string | null;
  baselineId: string;
};
const observations: Observation[] = [];
for (const role of roles) {
  const baseline = profiles.filter(profile => profile.primaryRole === role.id)
    .sort((a, b) => b.responseRate - a.responseRate || b.completedProjects - a.completedProjects
      || a.userId.localeCompare(b.userId))[0];
  for (const genre of genres) {
    for (const [wording, phrase] of [["장르명", genre.label], ["동의어", genre.alias], ["줄거리", genre.premise]]) {
      const query = `${phrase} 작품을 함께할 ${role.title} 한 명을 추천해 주세요.`;
      const [top] = rankMatchingCreators(profiles, resolveMatchingContext({ projectDescription: query }));
      observations.push({
        wording, query, expectedRole: role.id, expectedGenre: genre.label,
        selectedId: top?.creator.userId ?? null, selectedRole: top?.creator.primaryRole ?? null,
        selectedGenre: labels.get(top?.creator.userId) ?? null, baselineId: baseline.userId,
      });
    }
  }
}

function summarize(rows: Observation[]) {
  return {
    requests: rows.length,
    roleTop1: rows.filter(row => row.selectedRole === row.expectedRole).length,
    roleAndGenreTop1: rows.filter(row => row.selectedRole === row.expectedRole && row.selectedGenre === row.expectedGenre).length,
    baselineRoleAndGenreTop1: rows.filter(row => labels.get(row.baselineId) === row.expectedGenre).length,
  };
}

const absence = roles.map(role => {
  const pool = profiles.filter(profile => profile.primaryRole !== role.id);
  const context = resolveMatchingContext({ projectDescription: `미스터리 ${role.title} 한 명 추천해 주세요.` });
  return { excludedFromPool: role.id, returned: rankMatchingCreators(pool, context).length };
});
const summary = {
  synthetic: true, profiles: profiles.length,
  total: summarize(observations),
  byWording: Object.fromEntries(["장르명", "동의어", "줄거리"]
    .map(group => [group, summarize(observations.filter(row => row.wording === group))])),
  emptyWhenTargetRoleAbsent: absence.filter(row => row.returned === 0).length,
  absentRoleCases: absence.length,
};
console.log(JSON.stringify(process.argv.includes("--details") ? { summary, observations, absence } : summary, null, 2));
