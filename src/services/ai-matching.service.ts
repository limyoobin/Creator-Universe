import { MemberRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiMatchingInput = {
  projectDescription: string;
  preferredRoles?: MemberRole[];
  genres?: string[];
  limit?: number;
  messages?: AiChatMessage[];
};

type ProjectBrief = {
  summary: string;
  tone: string;
  topics: string[];
  neededRoles: string[];
};

type CreatorRecommendation = {
  rank: number;
  score: number;
  matchRate: number;
  reason: string;
  reasonDetails: string[];
  matchedKeywords: string[];
  suggestedMessage: string;
  creator: {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    isPartner: boolean;
    partnerTier: string | null;
    primaryRole: MemberRole;
    headline: string;
    bio: string;
    skills: string[];
    availabilityNote: string | null;
    responseRate: number;
    followerCount: number;
    completedProjects: number;
    featured: boolean;
    voiceDemo: {
      title: string;
      durationSeconds: number | null;
      waveform: number[];
    } | null;
  };
};

type AiMatchingResponse = {
  provider: "local";
  assistantMessage: string;
  projectBrief: ProjectBrief;
  recommendations: CreatorRecommendation[];
  followUpSuggestions: string[];
};

type ConversationIntent =
  | "greeting"
  | "smallTalk"
  | "confusion"
  | "clarify"
  | "explain"
  | "compare"
  | "message"
  | "settlement"
  | "rolePriority"
  | "refine"
  | "shorten"
  | "toneChange"
  | "nextStep"
  | "recommend";

const roleLabels: Record<MemberRole, string> = {
  WRITER: "글",
  ILLUSTRATOR: "그림",
  VOICE_ACTOR: "목소리",
  SOUND_DIRECTOR: "BGM",
  PRODUCER: "프로듀서",
  EDITOR: "에디터",
};

const roleKeywords: Record<MemberRole, string[]> = {
  WRITER: ["글", "작가", "소설", "웹소설", "웹작가", "스토리작가", "원작자", "대본", "시나리오", "시놉시스", "스토리", "각색", "콘티", "문장", "라이트노벨"],
  ILLUSTRATOR: ["그림", "일러스트", "웹툰", "만화", "캐릭터", "표지", "키비주얼", "채색", "작화", "러프", "애니메이터", "애니메이션", "원화", "동화", "작감", "캐릭터디자인"],
  VOICE_ACTOR: ["목소리", "성우", "보이스", "더빙", "내레이션", "연기", "오디오", "저음", "대사", "감정", "나레이션", "보이스액터"],
  SOUND_DIRECTOR: ["bgm", "사운드", "음악", "효과음", "믹싱", "앰비언트", "asmr", "입체음향", "소리", "작곡", "음향", "폴리"],
  PRODUCER: ["프로듀서", "기획", "PM", "운영", "제작관리", "프로젝트", "감독", "연출", "애니메이션제작", "파일럿"],
  EDITOR: ["편집", "식자", "교정", "검수", "편집자", "후반작업", "자막"],
};

const topicKeywords: Record<string, string[]> = {
  로맨스: ["로맨스", "연애", "청춘", "짝사랑", "감정선", "설렘", "관계성"],
  판타지: ["판타지", "마법", "용", "세계관", "모험", "이세계", "서사"],
  미스터리: ["미스터리", "추리", "괴담", "도시괴담", "사건", "비밀", "실종"],
  스릴러: ["스릴러", "긴장", "공포", "추격", "서스펜스", "위험", "반전"],
  일상: ["일상", "성장", "동네", "카페", "생활", "우정", "공감"],
  힐링: ["힐링", "여유", "감성", "위로", "조용", "asmr", "휴식"],
  BL: ["bl", "비엘", "청춘", "관계성", "브로맨스"],
  웹툰: ["웹툰", "세로스크롤", "콘티", "작화", "채색", "컷"],
  소설: ["소설", "웹소설", "문장", "대본", "챕터", "원고"],
  오디오: ["오디오", "성우", "보이스", "대본 싱크", "입체음향", "사운드", "드라마"],
  애니메이션: ["애니메이션", "애니", "숏폼", "파일럿", "콘티", "원화", "동화", "연출", "작감", "캐릭터디자인"],
  네온: ["네온", "도시", "밤", "비", "라디오", "사이버"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function includesAny(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(normalize(keyword)));
}

function detectTopics(source: string) {
  const normalizedSource = normalize(source);

  return Object.entries(topicKeywords)
    .filter(([topic, aliases]) => normalizedSource.includes(normalize(topic)) || aliases.some((alias) => normalizedSource.includes(normalize(alias))))
    .map(([topic]) => topic);
}

function detectRoleNeeds(source: string, preferredRoles: MemberRole[]) {
  const normalizedSource = normalize(source);
  const detectedRoles = Object.entries(roleKeywords)
    .filter(([, aliases]) => aliases.some((alias) => normalizedSource.includes(normalize(alias))))
    .map(([role]) => role as MemberRole);

  return unique([...preferredRoles, ...detectedRoles]);
}

function extractKeywords(input: AiMatchingInput) {
  const source = normalize([input.projectDescription, ...(input.genres ?? [])].join(" "));
  const rawTokens = source.split(" ").filter((token) => token.length >= 2);
  const detectedTopics = detectTopics([input.projectDescription, ...(input.genres ?? [])].join(" ")).flatMap((topic) => [
    topic,
    ...(topicKeywords[topic] ?? []),
  ]);
  const detectedRoles = Object.entries(roleKeywords)
    .filter(([, aliases]) => aliases.some((alias) => source.includes(normalize(alias))))
    .flatMap(([, aliases]) => aliases);

  return unique([...rawTokens, ...detectedTopics, ...detectedRoles, ...(input.genres ?? [])])
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 36);
}

function weightedMatches(text: string, keywords: string[], weight: number) {
  const normalizedText = normalize(text);
  const matches = keywords.filter((keyword) => normalizedText.includes(normalize(keyword)));

  return {
    score: matches.length * weight,
    matches,
  };
}

function inferTone(projectDescription: string, topics: string[]) {
  const source = normalize(projectDescription);
  if (source.includes("어둡") || source.includes("비") || source.includes("밤") || topics.includes("미스터리")) {
    return "어두운 도시감과 미스터리한 긴장감";
  }
  if (topics.includes("로맨스")) {
    return "감정선이 살아있는 로맨스 무드";
  }
  if (topics.includes("힐링") || topics.includes("일상")) {
    return "편안하고 오래 머무는 감성";
  }
  if (topics.includes("판타지")) {
    return "세계관 확장에 강한 판타지 무드";
  }
  return "장르 확장에 쉬운 멀티 콘텐츠 무드";
}

function buildProjectBrief(input: AiMatchingInput): ProjectBrief {
  const topics = unique([...detectTopics([input.projectDescription, ...(input.genres ?? [])].join(" ")), ...(input.genres ?? [])]).slice(0, 6);
  const neededRoleEnums = detectRoleNeeds(input.projectDescription, input.preferredRoles ?? []).slice(0, 5);
  const tone = inferTone(input.projectDescription, topics);
  const neededRoles = neededRoleEnums.length > 0 ? neededRoleEnums.map((role) => roleLabels[role]) : ["그림", "목소리", "BGM"];

  return {
    summary: `${tone}을 중심으로 ${neededRoles.join(", ")} 작업을 붙이면 완성도가 올라갈 프로젝트로 보여요.`,
    tone,
    topics,
    neededRoles,
  };
}

function buildReasonDetails(input: {
  role: MemberRole;
  matchedKeywords: string[];
  preferredRoleMatched: boolean;
  responseRate: number;
  completedProjects: number;
  featured: boolean;
}) {
  const details = [];
  const roleText = roleLabels[input.role];

  if (input.preferredRoleMatched) {
    details.push(`요청한 직군과 ${roleText} 역할이 직접 맞습니다.`);
  }

  if (input.matchedKeywords.length > 0) {
    details.push(`${input.matchedKeywords.slice(0, 4).join(", ")} 키워드가 포트폴리오와 겹칩니다.`);
  }

  if (input.responseRate >= 90) {
    details.push(`응답률 ${input.responseRate}%라서 협업 상담을 빠르게 시작하기 좋습니다.`);
  }

  if (input.completedProjects > 0) {
    details.push(`완료 프로젝트 ${input.completedProjects}건의 협업 경험이 있습니다.`);
  }

  if (input.featured) {
    details.push("플랫폼 추천 프로필이라 초기 협업 안정성이 높게 평가됩니다.");
  }

  return details.length > 0 ? details : [`${roleText} 포지션에서 프로젝트 분위기와 협업 가능성을 기준으로 추천했습니다.`];
}

function buildPrimaryReason(role: MemberRole, matches: string[], preferredRoleMatched: boolean) {
  const roleText = roleLabels[role];
  const topKeywords = matches.slice(0, 4);

  if (topKeywords.length >= 2 && preferredRoleMatched) {
    return `${roleText} 포지션으로 잘 맞고, ${topKeywords.join(", ")} 감성이 포트폴리오에서 확인됩니다.`;
  }

  if (topKeywords.length > 0) {
    return `${topKeywords.join(", ")} 분위기의 작업 이력이 보여 이번 프로젝트와 결이 잘 맞습니다.`;
  }

  return `${roleText} 역할의 기본 역량과 협업 지표를 기준으로 추천했습니다.`;
}

function buildSuggestedMessage(projectDescription: string, creatorName: string, role: MemberRole, matchedKeywords: string[]) {
  const keywordText = matchedKeywords.slice(0, 3).join(", ") || "작품 분위기";
  const compactDescription = projectDescription.length > 90 ? `${projectDescription.slice(0, 90)}...` : projectDescription;

  return `${creatorName}님, ${compactDescription} 프로젝트를 준비 중입니다. ${keywordText} 방향의 포트폴리오가 잘 맞아 보여 ${roleLabels[role]} 포지션으로 협업 제안을 드리고 싶어요.`;
}

function getRecentUserTexts(input: AiMatchingInput) {
  return (input.messages ?? [])
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .slice(-6);
}

function getPreviousUserTexts(input: AiMatchingInput) {
  const latestText = input.projectDescription.trim();
  const recentTexts = getRecentUserTexts(input);

  if (!latestText) {
    return recentTexts;
  }

  const latestIndex = recentTexts.lastIndexOf(latestText);
  if (latestIndex < 0) {
    return recentTexts;
  }

  return recentTexts.filter((_, index) => index !== latestIndex);
}

function isLowSignalConversationText(text: string) {
  const source = normalize(text);

  return (
    /^[?？!！\s]+$/.test(text) ||
    includesAny(source, [
      "뭐야",
      "무슨 말",
      "무슨 뜻",
      "뭔소리",
      "뭔 소리",
      "이게 뭐",
      "이상",
      "고장",
      "안돼",
      "안 되",
      "이해 안",
      "모르겠",
      "왜 이래",
      "왜 그래",
    ]) ||
    (source.length <= 4 && ["왜", "뭐", "응", "아니"].some((keyword) => source.includes(keyword)))
  );
}

function getConversationSource(input: AiMatchingInput) {
  const recentTexts = getRecentUserTexts(input);
  const projectSignals = unique([...recentTexts, input.projectDescription.trim()].filter(Boolean)).filter(
    (text) => !isLowSignalConversationText(text),
  );

  return (projectSignals.length > 0 ? projectSignals : recentTexts).join("\n");
}

function buildConversationAwareInput(input: AiMatchingInput): AiMatchingInput {
  const conversationSource = getConversationSource(input);

  return {
    ...input,
    projectDescription: conversationSource || input.projectDescription,
  };
}

function isMatchingRequestText(source: string) {
  return includesAny(source, [
    "찾아줘",
    "추천",
    "골라",
    "누구",
    "맞는",
    "어울리는",
    "필요",
    "섭외",
    "팀원",
    "작가",
    "성우",
    "그림",
    "일러스트",
    "애니메이터",
    "프로듀서",
    "bgm",
    "사운드",
  ]);
}

function getConversationIntent(latestText: string): ConversationIntent {
  const source = normalize(latestText);
  const isMatchingRequest = isMatchingRequestText(source);

  if (includesAny(source, ["안녕", "하이", "hello", "처음", "시작"]) && !isMatchingRequest) {
    return "greeting";
  }

  if (
    includesAny(source, [
      "뭐야",
      "무슨 말",
      "무슨 뜻",
      "뭔소리",
      "뭔 소리",
      "이게 뭐",
      "이상",
      "고장",
      "안돼",
      "안 되",
      "이해 안",
      "모르겠",
      "왜 이래",
      "왜 그래",
    ]) ||
    /^[?？!！\s]+$/.test(latestText) ||
    (source.length <= 4 && ["왜", "뭐", "응", "아니"].some((keyword) => source.includes(keyword)))
  ) {
    return "confusion";
  }

  if (
    includesAny(source, ["고마워", "감사", "좋아", "오케이", "ㅇㅋ", "알겠", "괜찮", "재밌", "대박", "너 뭐", "뭐해", "도와줘"]) &&
    !isMatchingRequest
  ) {
    return "smallTalk";
  }

  if (source.length < 8 && !source.includes("추천") && !isMatchingRequest) {
    return "clarify";
  }

  if (includesAny(source, ["짧게", "간단", "요약", "한줄", "한 줄"])) {
    return "shorten";
  }

  if (includesAny(source, ["친근", "부드럽", "공손", "자연스럽", "말투", "톤 바꿔"])) {
    return "toneChange";
  }

  if (includesAny(source, ["다음", "어떻게", "뭘 하면", "진행", "순서", "액션", "계획"])) {
    return "nextStep";
  }

  if (includesAny(source, ["왜", "이유", "근거", "설명", "어떤 점"])) {
    return "explain";
  }

  if (includesAny(source, ["비교", "누가 더", "누구가 더", "1순위", "2순위", "더 좋아", "차이"])) {
    return "compare";
  }

  if (includesAny(source, ["메시지", "dm", "디엠", "제안서", "보낼 말", "첫 문장", "문구", "연락"])) {
    return "message";
  }

  if (includesAny(source, ["지분", "수익", "정산", "퍼센트", "분배", "수수료", "계약"])) {
    return "settlement";
  }

  if (includesAny(source, ["먼저", "우선", "섭외", "첫번째", "첫 번째"])) {
    return "rolePriority";
  }

  if (includesAny(source, ["다른", "바꿔", "말고", "추가", "수정", "조건", "더", "별로", "다시"])) {
    return "refine";
  }

  return "recommend";
}

function buildCandidateLine(item: CreatorRecommendation) {
  const roleText = roleLabels[item.creator.primaryRole];
  const keywordText = item.matchedKeywords.slice(0, 3).join(", ") || item.creator.headline;

  return `${item.rank}순위 ${item.creator.displayName}님(${roleText}) · ${item.matchRate}% 매칭 · ${keywordText}`;
}

function buildMemoryLine(previousUserTexts: string[]) {
  if (previousUserTexts.length === 0) {
    return "";
  }

  const compactMemory = previousUserTexts
    .slice(-2)
    .map((text) => (text.length > 42 ? `${text.slice(0, 42)}...` : text))
    .join(" / ");

  return `기억하고 있는 조건: ${compactMemory}`;
}

function buildRecommendationSnapshot(recommendations: CreatorRecommendation[]) {
  return recommendations
    .slice(0, 3)
    .map((item) => `- ${buildCandidateLine(item)}\n  이유: ${item.reasonDetails.slice(0, 2).join(" ")}`)
    .join("\n");
}

function buildRankedRecommendationBlock(recommendations: CreatorRecommendation[]) {
  return recommendations
    .slice(0, 3)
    .map((item) => {
      const roleText = roleLabels[item.creator.primaryRole];
      const details = item.reasonDetails.slice(0, 2);
      const keywordText = item.matchedKeywords.length > 0 ? item.matchedKeywords.slice(0, 4).join(", ") : "공개 포트폴리오와 협업 지표";

      return `${item.rank}순위. ${item.creator.displayName}님 (${roleText})\n- 왜 ${item.rank}순위냐면: ${item.reason}\n- 근거: ${details.join(" ")}\n- 맞는 키워드: ${keywordText}`;
    })
    .join("\n\n");
}

function buildConversationalAssistantMessage(
  originalInput: AiMatchingInput,
  brief: ProjectBrief,
  recommendations: CreatorRecommendation[],
) {
  const latestText = originalInput.projectDescription.trim();
  const previousUserTexts = getPreviousUserTexts(originalInput);
  const intent = getConversationIntent(latestText);
  const top = recommendations[0];
  const second = recommendations[1];
  const third = recommendations[2];
  const contextPrefix = previousUserTexts.length > 0 ? "앞에서 말한 조건까지 이어서 보면, " : "";
  const memoryLine = buildMemoryLine(previousUserTexts);

  if (!top) {
    return `${contextPrefix}아직 공개된 매칭 프로필만으로는 확실한 후보를 못 고르겠어요.\n\n${memoryLine ? `${memoryLine}\n\n` : ""}지금 방향은 ${brief.tone} 쪽이라서, 먼저 필요한 직군을 ${brief.neededRoles.join(", ")} 순서로 좁히면 추천 정확도가 올라가요.`;
  }

  if (intent === "greeting") {
    return `안녕하세요. 저는 작품 톤, 필요한 직군, 공개 포트폴리오를 같이 보면서 팀원을 골라주는 AI 매칭 매니저예요.\n\n일상적으로 물어봐도 괜찮고, “이 아이디어에 맞는 작가 찾아줘”, “미스터리 애니메이션에 어울리는 성우 추천해줘”처럼 말하면 1·2·3순위와 각각의 이유까지 정리해드릴게요.`;
  }

  if (intent === "smallTalk") {
    return `좋아요. 편하게 이야기해도 돼요.\n\n저는 잡담을 받아주다가도, 작품 얘기가 나오면 바로 매칭 기준으로 바꿔서 도와드릴 수 있어요. 예를 들면 “일상 힐링 웹툰인데 작가랑 애니메이터 찾아줘”라고 말하면 후보 1·2·3순위와 추천 이유를 같이 보여드릴게요.`;
  }

  if (intent === "clarify") {
    return `조금만 더 알려주면 훨씬 정확하게 골라볼 수 있어요.\n\n지금은 ${brief.tone} 쪽으로 읽히고, 필요한 역할은 ${brief.neededRoles.join(", ")} 쪽으로 보여요. 여기에 “장르”, “주인공 분위기”, “먼저 필요한 작업” 중 하나만 더 붙여주면 후보를 다시 좁혀볼게요.`;
  }

  if (intent === "confusion") {
    const candidateCountNote =
      recommendations.length <= 1
        ? "지금 공개 매칭 프로필이 적어서 같은 후보가 반복 추천되는 것처럼 보일 수 있어요. 후보가 늘어나면 비교 답변도 더 다양해집니다."
        : `${top.creator.displayName}님을 기준으로 보되, ${second ? `${second.creator.displayName}님과 비교해서` : "다른 후보와 비교해서"} 더 좁힐 수 있어요.`;

    return `제가 방금 너무 압축해서 말했네요. 쉽게 풀면 이 뜻이에요.\n\n1. 현재 대화에서 읽은 작품 방향은 “${brief.tone}”입니다.\n2. 필요한 역할은 ${brief.neededRoles.join(", ")} 쪽으로 잡혔어요.\n3. 그래서 공개 포트폴리오와 겹치는 후보 중 ${top.creator.displayName}님을 먼저 추천했습니다.\n\n${candidateCountNote}\n\n원하면 바로 “왜 ${top.creator.displayName}이야?”, “다른 사람으로 다시 골라줘”, “성우 말고 그림부터 추천해줘”처럼 물어보면 그 기준으로 다시 계산할게요.`;
  }

  if (intent === "explain") {
    return `${contextPrefix}${top.creator.displayName}님을 먼저 둔 이유는 이렇게 정리돼요.\n\n1. ${top.reason}\n2. ${top.reasonDetails[0] ?? "작품 분위기와 작업 방향이 맞아요"}\n3. 응답률이 ${top.creator.responseRate}%라 베타 협업에서 대화가 끊길 위험이 낮아요.\n\n${second ? `다만 ${second.creator.displayName}님은 ${roleLabels[second.creator.primaryRole]} 보조 후보로 같이 두면 팀 밸런스가 좋아집니다.` : "현재 후보군에서는 이 사람이 가장 안정적이에요."}`;
  }

  if (intent === "compare" && second) {
    return `${contextPrefix}비교하면 결론은 이래요.\n\n${top.creator.displayName}님: 빠른 협업 시작에 유리해요. ${top.reason}\n${second.creator.displayName}님: 톤을 넓히거나 백업 후보로 두기 좋아요. ${second.reason}\n\n그래서 MVP를 빨리 만들 거면 ${top.creator.displayName}님을 먼저, 작품 결을 더 실험하고 싶으면 ${second.creator.displayName}님까지 같이 연락하는 흐름이 좋아 보여요.`;
  }

  if (intent === "message") {
    return `${contextPrefix}바로 보낼 수 있게 다듬어볼게요.\n\n“안녕하세요, ${top.creator.displayName}님. 공개 포트폴리오를 보고 제 작품의 ${brief.tone}과 잘 맞을 것 같아 연락드립니다. ${top.suggestedMessage} 괜찮으시다면 짧게 작품 톤과 작업 범위, 예상 지분율을 맞춰보고 싶어요.”\n\n포인트는 처음부터 계약처럼 딱딱하게 들어가지 않고, 작품 톤 → 작업 범위 → 지분율 순서로 자연스럽게 여는 거예요.`;
  }

  if (intent === "settlement") {
    const roleText = top ? roleLabels[top.creator.primaryRole] : brief.neededRoles[0] ?? "팀원";
    return `${contextPrefix}정산 제안은 짧고 투명하게 말하는 게 좋아요.\n\n추천 문구: “플랫폼 수수료는 일반 13%, 파트너 8%로 고정이고, 차감 후 금액을 합의한 지분율대로 자동 분배하는 방식으로 진행하고 싶습니다.”\n\n${roleText} 포지션의 핵심 기여도가 높다면 30:30:40 구조에서 팀장 또는 핵심 제작자에게 40%를 배정하고, 나머지 60%를 참여 직군끼리 나누는 방식이 이해하기 쉽습니다.`;
  }

  if (intent === "rolePriority") {
    const orderedRoles = unique(recommendations.map((item) => roleLabels[item.creator.primaryRole]));
    return `${contextPrefix}섭외 순서는 ${orderedRoles.join(" → ")} 쪽을 추천해요.\n\n지금 작품은 ${brief.tone}이 중요해서, 먼저 ${top.creator.displayName}님으로 중심 톤을 잡고${second ? `, 그 다음 ${second.creator.displayName}님을 붙여 결과물의 결을 맞추는 흐름` : ""}이 안정적입니다.`;
  }

  if (intent === "refine") {
    return `${contextPrefix}조건을 조금 바꿔서 다시 보면, 1순위만 고정하지 말고 이렇게 보는 게 좋아요.\n\n${buildRecommendationSnapshot([top, second, third].filter(Boolean) as CreatorRecommendation[])}\n\n만약 “성우 말고 그림 먼저”, “BGM은 나중에”처럼 제외 조건을 말해주면 그 기준으로 다시 좁혀볼게요.`;
  }

  if (intent === "shorten") {
    return `${top.creator.displayName}님을 1순위로 추천해요. ${top.reason} ${second ? `${second.creator.displayName}님은 백업 후보로 같이 보면 좋습니다.` : ""}`;
  }

  if (intent === "toneChange") {
    return `조금 더 자연스럽게 말하면 이렇게요.\n\n“${top.creator.displayName}님, 포트폴리오를 보고 제 작품 분위기와 잘 맞을 것 같아 연락드려요. 부담 없이 작품 톤과 작업 범위를 먼저 이야기해볼 수 있을까요?”\n\n이 톤은 초반 협업 상담에서 부담이 적고, 답장을 받기 좋은 편이에요.`;
  }

  if (intent === "nextStep") {
    return `${contextPrefix}다음 액션은 3단계로 가면 좋아요.\n\n1. ${top.creator.displayName}님에게 짧은 DM을 보내서 관심 여부를 확인합니다.\n2. 답장이 오면 작업 범위와 예상 일정부터 맞춥니다.\n3. 마지막에 13% 수수료 차감 후 지분율 자동 정산 구조를 공유합니다.\n\n${second ? `동시에 ${second.creator.displayName}님은 백업 후보로 저장해두면 좋아요.` : ""}`;
  }

  const rankedBlock = buildRankedRecommendationBlock([top, second, third].filter(Boolean) as CreatorRecommendation[]);

  return `${contextPrefix}좋아요. 이 작품은 ${brief.summary}\n\n추천 순위는 이렇게 볼게요.\n\n${rankedBlock}\n\n정리하면, 1순위는 작품 키워드와 포트폴리오 접점이 가장 강한 후보이고, 2·3순위는 팀 밸런스를 보완하거나 백업으로 연락하기 좋은 후보입니다.`;
}

function buildConversationalFollowUpSuggestions(
  input: AiMatchingInput,
  brief: ProjectBrief,
  recommendations: CreatorRecommendation[],
) {
  const top = recommendations[0];
  const second = recommendations[1];
  const roleText = brief.neededRoles.length > 0 ? brief.neededRoles.join(", ") : "그림, 목소리, BGM";
  const baseSuggestions = [
    top ? `${top.creator.displayName}님에게 보낼 DM을 더 자연스럽게 써줘` : `${roleText} 중 먼저 필요한 역할을 골라줘`,
    second && top ? `${top.creator.displayName}님과 ${second.creator.displayName}님을 비교해줘` : "추천 후보를 고르는 기준을 설명해줘",
    "13% 수수료와 30:30:40 지분 기준으로 제안 문구를 만들어줘",
  ].filter(Boolean) as string[];

  const intent = getConversationIntent(input.projectDescription);

  if (intent === "message" || intent === "toneChange") {
    return [
      "조금 더 친근한 말투로 바꿔줘",
      "정산 조건까지 포함해서 다시 써줘",
      "거절당했을 때 보낼 답장도 써줘",
    ];
  }

  if (intent === "confusion") {
    return [
      "방금 추천을 더 쉽게 풀어줘",
      top ? `왜 ${top.creator.displayName}님인지 점수 기준으로 설명해줘` : "추천 기준을 점수로 설명해줘",
      "다른 후보로 다시 골라줘",
    ];
  }

  if (intent === "compare" || intent === "explain") {
    return [
      top ? `${top.creator.displayName}님에게 먼저 연락해도 될까?` : "1순위 기준을 다시 설명해줘",
      second && top ? `${second.creator.displayName}님이 더 나은 경우도 알려줘` : "백업 후보도 찾아줘",
      "다음 액션을 3단계로 정리해줘",
    ].filter(Boolean) as string[];
  }

  if (intent === "settlement") {
    return [
      "30:30:40 지분 제안 DM을 써줘",
      "파트너 수수료 8%일 때도 설명해줘",
      "팀원이 부담스럽지 않게 말해줘",
    ];
  }

  return baseSuggestions;
}

function buildAssistantMessage(input: AiMatchingInput, recommendations: CreatorRecommendation[]) {
  const brief = buildProjectBrief(input);
  const top = recommendations[0];
  const previousUserQuestions = input.messages?.filter((message) => message.role === "user").slice(-2).map((message) => message.content) ?? [];
  const contextHint = previousUserQuestions.length > 0 ? `앞서 말한 "${previousUserQuestions.join(" / ")}" 흐름까지 같이 보면, ` : "";

  if (!top) {
    return `${contextHint}${brief.summary} 다만 지금 공개된 매칭 프로필이 부족해서 추천 후보를 확정하지 못했어요. 먼저 창작자 프로필을 조금 더 모으면 좋아요.`;
  }

  const secondLine =
    recommendations.length > 1
      ? "2순위와 3순위는 보조 포지션으로 같이 붙이면 팀 밸런스가 좋아질 후보로 골랐어요."
      : "현재 데이터에서는 이 후보가 가장 강하게 맞습니다.";

  return `${contextHint}작품 설명을 읽어보니 ${brief.summary} 그래서 1순위는 ${top.creator.displayName}님을 추천해요. ${top.reason} ${secondLine}`;
}

function buildFollowUpSuggestions(brief: ProjectBrief) {
  const roleText = brief.neededRoles.length > 0 ? brief.neededRoles.join(", ") : "그림, 목소리, BGM";

  return [
    `이 장르에 맞는 ${roleText} 후보를 1·2·3순위로 찾아줘`,
    "각 순위가 왜 그 순위인지 더 자세히 설명해줘",
    "추천 후보에게 보낼 첫 메시지를 써줘",
  ];
}

function buildResponse(input: AiMatchingInput, recommendations: CreatorRecommendation[]): AiMatchingResponse {
  const brief = buildProjectBrief(input);

  return {
    provider: "local",
    assistantMessage: buildAssistantMessage(input, recommendations),
    projectBrief: brief,
    recommendations,
    followUpSuggestions: buildFollowUpSuggestions(brief),
  };
}

export async function recommendCreatorsForProject(input: AiMatchingInput): Promise<AiMatchingResponse> {
  const keywords = extractKeywords(input);
  const preferredRoles = input.preferredRoles ?? [];
  const limit = Math.max(1, Math.min(input.limit ?? 3, 6));

  const profiles = await prisma.creatorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          isPartner: true,
          partnerTier: true,
        },
      },
    },
    orderBy: [{ featured: "desc" }, { followerCount: "desc" }, { completedProjects: "desc" }],
  });

  const recommendations = profiles
    .map((profile) => {
      const roleKeywordMatches = roleKeywords[profile.primaryRole].filter((keyword) =>
        normalize(input.projectDescription).includes(normalize(keyword)),
      );
      const preferredRoleMatched = preferredRoles.length === 0 || preferredRoles.includes(profile.primaryRole);
      const skillMatch = weightedMatches(profile.skills.join(" "), keywords, 18);
      const headlineMatch = weightedMatches(profile.headline, keywords, 13);
      const bioMatch = weightedMatches(profile.bio, keywords, 9);
      const roleMatchScore = roleKeywordMatches.length * 14 + (preferredRoleMatched ? 18 : -8);
      const activityScore = Math.min(profile.responseRate / 10, 10) + Math.min(profile.completedProjects * 1.5, 12);
      const featuredScore = profile.featured ? 8 : 0;
      const score = Math.max(
        0,
        skillMatch.score + headlineMatch.score + bioMatch.score + roleMatchScore + activityScore + featuredScore,
      );
      const matchedKeywords = unique([
        ...skillMatch.matches,
        ...headlineMatch.matches,
        ...bioMatch.matches,
        ...roleKeywordMatches,
      ]).slice(0, 8);
      const reason = buildPrimaryReason(profile.primaryRole, matchedKeywords, preferredRoleMatched);

      return {
        rank: 0,
        score: Math.round(score),
        matchRate: Math.max(42, Math.min(98, Math.round(52 + score * 0.72))),
        reason,
        reasonDetails: buildReasonDetails({
          role: profile.primaryRole,
          matchedKeywords,
          preferredRoleMatched,
          responseRate: profile.responseRate,
          completedProjects: profile.completedProjects,
          featured: profile.featured,
        }),
        matchedKeywords,
        suggestedMessage: buildSuggestedMessage(input.projectDescription, profile.user.displayName, profile.primaryRole, matchedKeywords),
        creator: {
          id: profile.user.id,
          userId: profile.user.id,
          username: profile.user.username,
          displayName: profile.user.displayName,
          isPartner: profile.user.isPartner,
          partnerTier: profile.user.partnerTier,
          primaryRole: profile.primaryRole,
          headline: profile.headline,
          bio: profile.bio,
          skills: profile.skills,
          availabilityNote: profile.availabilityNote,
          responseRate: profile.responseRate,
          followerCount: profile.followerCount,
          completedProjects: profile.completedProjects,
          featured: profile.featured,
          voiceDemo: profile.voiceDemoTitle
            ? {
                title: profile.voiceDemoTitle,
                durationSeconds: profile.voiceDemoDurationSeconds,
                waveform: profile.voiceWaveform,
              }
            : null,
        },
      };
    })
    .sort((left, right) => right.score - left.score || right.creator.responseRate - left.creator.responseRate)
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return buildResponse(input, recommendations);
}

export async function createAiMatchingChat(input: AiMatchingInput): Promise<AiMatchingResponse> {
  const conversationInput = buildConversationAwareInput(input);
  const response = await recommendCreatorsForProject(conversationInput);

  return {
    ...response,
    assistantMessage: buildConversationalAssistantMessage(input, response.projectBrief, response.recommendations),
    followUpSuggestions: buildConversationalFollowUpSuggestions(input, response.projectBrief, response.recommendations),
  };
}
