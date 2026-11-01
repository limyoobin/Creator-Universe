/** Shared by the API and offline recommendations so the same brief has the same ranking. */
export const matchingRoleLabels: Record<string, string> = {
  WRITER: "글", ILLUSTRATOR: "그림", VOICE_ACTOR: "목소리",
  SOUND_DIRECTOR: "BGM", PRODUCER: "프로듀서", EDITOR: "에디터",
};

const rolePhrases: Record<string, string[]> = {
  WRITER: ["글 작가", "소설 작가", "웹소설 작가", "대본 작가", "시나리오 작가", "스토리 작가", "원고 담당"],
  ILLUSTRATOR: ["그림 작가", "웹툰 작가", "만화 작가", "표지 작가", "콘티 작가", "일러스트 작가", "일러스트레이터", "키비주얼 작가", "캐릭터 디자이너", "애니메이터", "원화가"],
  VOICE_ACTOR: ["성우", "목소리 담당", "보이스 배우", "더빙 배우", "내레이션 담당"],
  SOUND_DIRECTOR: ["사운드 디자이너", "사운드디자이너", "음향 감독", "음향 담당", "bgm 담당", "브금 담당", "효과음 담당", "작곡가", "믹싱 엔지니어", "ost 담당"],
  PRODUCER: ["프로듀서", "기획자", "제작자", "연출자", "프로젝트 매니저"],
  EDITOR: ["편집자", "에디터", "식자 담당", "교정 담당", "검수 담당", "자막 담당"],
};
const roleWords: Record<string, string[]> = {
  WRITER: ["글", "작가", "대본", "소설", "웹소설", "시나리오"],
  ILLUSTRATOR: ["그림", "일러스트", "작화", "웹툰", "만화", "표지", "콘티", "원화"],
  VOICE_ACTOR: ["목소리", "보이스", "더빙", "내레이션", "나레이션"],
  SOUND_DIRECTOR: ["bgm", "브금", "사운드", "음향", "효과음", "작곡", "믹싱", "ost"],
  PRODUCER: ["기획", "제작관리", "프로젝트 매니저"],
  EDITOR: ["편집", "식자", "교정", "검수", "자막"],
};
const topicAliases: Record<string, string[]> = {
  로맨스: ["로맨스", "연애", "감정선", "로판"],
  판타지: ["판타지", "마법", "이세계", "모험", "로판"],
  미스터리: ["미스터리", "추리", "괴담", "도시괴담"],
  스릴러: ["스릴러", "공포", "서스펜스", "긴장감"],
  힐링: ["힐링", "치유", "잔잔", "따뜻", "포근"],
  일상: ["일상", "성장", "생활"],
  SF: ["sf", "공상과학", "사이버펑크", "우주"],
  코미디: ["코미디", "개그", "유머"],
  오디오드라마: ["오디오드라마", "보이스드라마", "입체음향"],
  애니메이션: ["애니메이션", "애니메이터", "원화", "동화"],
  웹툰: ["웹툰", "만화", "콘티", "세로스크롤"],
  소설: ["웹소설", "소설", "원고"],
};
const workKeywords = ["저음", "중저음", "고음", "네온", "수채화", "채색", "배경", "캐릭터", "각색", "감정연기", "대사", "대본", "콘티", "표지", "키비주얼", "입체음향", "효과음", "믹싱", "피아노", "오케스트라", "어쿠스틱", "전자음악", "asmr", "라이브2d", "액션"];
const unique = <T,>(items: T[]) => [...new Set(items)];
const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const exclusions = "(?:님)?(?:은|는|을|를|이|가|도)?(?:말고|제외|빼고|빼줘|빼주세요|필요없|나중|후순위|아니고|아닌)";
const excludedAlias = (text: string, alias: string) => new RegExp(normalize(alias) + exclusions).test(normalize(text));

function currentRoleText(text: string) {
  const markers = ["지금은", "이번엔", "이번에는", "현재는", "이번 질문은", "다음은"];
  const index = Math.max(...markers.map(marker => text.lastIndexOf(marker)));
  return index < 0 ? text : text.slice(index);
}

export function detectMatchingExcludedRoles(text: string): string[] {
  const source = currentRoleText(text);
  const illustratorExcluded = rolePhrases.ILLUSTRATOR.some(alias => excludedAlias(source, alias));
  return Object.keys(matchingRoleLabels).filter(role =>
    [...rolePhrases[role], ...roleWords[role]].some(alias =>
      // “그림 작가는 제외” must not exclude writers as a side effect of “작가”.
      !(role === "WRITER" && alias === "작가" && illustratorExcluded) && excludedAlias(source, alias),
    ),
  );
}

export function detectMatchingRoles(text: string): string[] {
  const source = normalize(currentRoleText(text));
  const excluded = detectMatchingExcludedRoles(text);
  const precise = Object.keys(rolePhrases).filter(role => rolePhrases[role].some(alias => source.includes(normalize(alias))));
  const directWords: Record<string, string[]> = {
    WRITER: precise.includes("ILLUSTRATOR") ? ["글"] : ["글", "작가"],
    ILLUSTRATOR: ["그림", "일러스트"], VOICE_ACTOR: ["목소리", "보이스", "더빙"],
    SOUND_DIRECTOR: roleWords.SOUND_DIRECTOR, PRODUCER: ["프로듀서"], EDITOR: ["에디터", "편집"],
  };
  // Explicit job titles take precedence over media mentioned as project context.
  const roles = precise.length
    ? unique([...precise, ...Object.keys(directWords).filter(role => directWords[role].some(alias => source.includes(normalize(alias))))])
    : Object.keys(roleWords).filter(role => roleWords[role].some(alias => source.includes(normalize(alias))));
  return roles.filter(role => !excluded.includes(role));
}

export function detectMatchingLimit(text: string): number | null {
  const source = currentRoleText(text).toLowerCase();
  const numeric = source.match(/(?:top\s*(\d+))|(?:(\d+)\s*(?:명|분|사람|순위까지))/);
  if (numeric) return Math.max(1, Math.min(Number(numeric[1] ?? numeric[2]), 6));
  const korean = source.match(/(한|두|세|네|다섯|여섯)\s*(?:명|분|사람)/);
  if (korean) return ({ 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6 } as Record<string, number>)[korean[1]];
  if (/원픽|첫\s*번째만|하나만/.test(source)) return 1;
  return null;
}

export type MatchingInput = {
  projectDescription: string;
  preferredRoles?: string[];
  genres?: string[];
  limit?: number;
  messages?: Array<{ role: string; content: string }>;
};
export type MatchingContext = {
  source: string;
  roles: string[];
  excludedRoles: string[];
  topics: string[];
  workTerms: string[];
  limit: number;
};

export function resolveMatchingContext(input: MatchingInput): MatchingContext {
  const history = (input.messages ?? []).filter(message => message.role === "user").map(message => message.content.trim()).slice(-8);
  if (history[history.length - 1] === input.projectDescription.trim()) history.pop();
  let texts = [...history, input.projectDescription.trim()];
  const resetIndex = texts.reduce((latest, text, index) => /새(?:로운)?\s*(?:작품|프로젝트)|이전\s*조건.*잊/.test(text) ? index : latest, -1);
  if (resetIndex >= 0) texts = texts.slice(resetIndex);
  let roles = input.preferredRoles ?? [];
  let excludedRoles: string[] = [];
  let limit = input.limit ?? 3;
  for (const text of texts) {
    const detected = detectMatchingRoles(text);
    const excluded = detectMatchingExcludedRoles(text);
    if (detected.length) roles = detected;
    excludedRoles = unique([...excludedRoles.filter(role => !detected.includes(role)), ...excluded]);
    roles = roles.filter(role => !excludedRoles.includes(role));
    limit = detectMatchingLimit(text) ?? limit;
  }
  const source = texts.join("\n");
  const topicSource = [source, ...(input.genres ?? [])].join(" ");
  const normalized = normalize(topicSource);
  const topics = Object.entries(topicAliases).filter(([, aliases]) =>
    aliases.some(alias => normalized.includes(normalize(alias))) && !aliases.some(alias => excludedAlias(topicSource, alias)),
  ).map(([topic]) => topic);
  const workTerms = workKeywords.filter(term => normalized.includes(normalize(term)) && !excludedAlias(topicSource, term));
  return { source, roles, excludedRoles, topics, workTerms, limit: Math.max(1, Math.min(limit, 6)) };
}

export type MatchSignal = { label: string; points: number; maximum: number; detail: string };
export type MatchableCreator = {
  userId: string; displayName: string; primaryRole: string; headline: string; bio: string;
  skills: string[]; responseRate: number; completedProjects: number;
  portfolioSummary?: string;
  portfolioItems?: Array<{ title: string; category: string; description: string; tags: string[] }>;
  voiceDemo?: { title: string } | null;
};

export function rankMatchingCreators<T extends MatchableCreator>(creators: T[], context: MatchingContext) {
  const ranked = creators.filter(creator => !excludedAlias(context.source, creator.displayName) && !context.excludedRoles.includes(creator.primaryRole) &&
    (!context.roles.length || context.roles.includes(creator.primaryRole))).map(creator => {
    const evidence = normalize([creator.headline, creator.bio, ...creator.skills, creator.portfolioSummary ?? "", creator.voiceDemo?.title ?? "",
      ...(creator.portfolioItems ?? []).flatMap(item => [item.title, item.category, item.description, ...item.tags])].join(" "));
    const topics = context.topics.filter(topic => topicAliases[topic].some(alias => evidence.includes(normalize(alias))));
    const workTerms = context.workTerms.filter(term => evidence.includes(normalize(term)));
    const rolePoints = context.roles.length ? 30 : 0;
    const topicPoints = context.topics.length ? Math.round(35 * topics.length / context.topics.length) : 0;
    const workPoints = context.workTerms.length ? Math.round(20 * workTerms.length / context.workTerms.length) : 0;
    const responseRate = Math.max(0, Math.min(100, creator.responseRate || 0));
    const completedProjects = Math.max(0, creator.completedProjects || 0);
    const activityPoints = Math.round(8 * responseRate / 100 + 7 * Math.min(completedProjects, 20) / 20);
    const matchedKeywords = unique([...topics, ...workTerms]);
    const matchSignals: MatchSignal[] = [
      { label: "직군", points: rolePoints, maximum: 30, detail: context.roles.length ? `요청한 ${matchingRoleLabels[creator.primaryRole]} 직군과 일치` : "직군을 고르면 더 정확해져요" },
      { label: "작품 방향", points: topicPoints, maximum: 35, detail: topics.length ? `${topics.join(" · ")} 관련 공개 프로필` : context.topics.length ? "작품 분위기와의 공통점 확인 필요" : "장르·분위기를 알려주세요" },
      { label: "작업 역량", points: workPoints, maximum: 20, detail: workTerms.length ? `${workTerms.join(" · ")} 작업 키워드 일치` : context.workTerms.length ? "필요한 작업 경험 확인 필요" : "원하는 작업 방식을 알려주세요" },
      { label: "협업 기록", points: activityPoints, maximum: 15, detail: `응답률 ${responseRate}% · 완료 프로젝트 ${completedProjects}건` },
    ];
    const score = matchSignals.reduce((total, signal) => total + signal.points, 0);
    const reason = matchedKeywords.length
      ? `${matchedKeywords.slice(0, 4).join(", ")} 관련 경험이 공개 프로필에서 확인됩니다.`
      : "직군과 협업 기록을 기준으로 찾았어요. 작품 분위기와 작업 경험은 상담에서 확인해 주세요.";
    return {
      rank: 0, score, matchRate: score, matchSignals, reason,
      reasonDetails: matchSignals.map(signal => signal.detail), matchedKeywords,
      suggestedMessage: `${creator.displayName}님, ${context.topics.join(" · ") || "새 작품"} 프로젝트의 ${matchingRoleLabels[creator.primaryRole]} 팀원을 찾고 있습니다. ${matchedKeywords.length ? `${matchedKeywords.slice(0, 3).join(", ")} 경험을 보고 연락드려요. ` : "공개 프로필을 보고 연락드려요. "}가능한 일정과 작업 범위를 함께 이야기할 수 있을까요?`,
      creator,
    };
  }).sort((left, right) => right.score - left.score || left.creator.userId.localeCompare(right.creator.userId));

  // A team request should cover each requested role when the result count allows it.
  const selected = context.roles.length > 1 && context.limit >= context.roles.length
    ? context.roles.map(role => ranked.find(item => item.creator.primaryRole === role)).filter((item): item is typeof ranked[number] => Boolean(item))
    : [];
  for (const item of ranked) {
    if (selected.length >= context.limit) break;
    if (!selected.some(existing => existing.creator.userId === item.creator.userId)) selected.push(item);
  }
  return selected.sort((left, right) => right.score - left.score || left.creator.userId.localeCompare(right.creator.userId))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
