import { MemberRole } from "@prisma/client";
import { detectMatchingRoles, detectMatchingExcludedRoles, detectMatchingLimit, matchingReviewTags, resolveMatchingContext, rankMatchingCreators, type MatchSignal } from "../../shared/creator-matching.js";
import { reviewMatchingShortlist } from "./matching-consensus.js";
import type { MatchingProvider } from "../lib/matching-providers.js";
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
  matchSignals?: MatchSignal[];
  reason: string;
  reasonDetails: string[];
  matchedKeywords: string[];
  reviewEvidence?: string[];
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
  provider: "local" | "ensemble" | MatchingProvider;
  providersUsed: MatchingProvider[];
  providerNote?: string;
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
  | "uploadGuide"
  | "paymentGuide"
  | "releaseGuide"
  | "ideaCoach"
  | "platformGuide"
  | "generalQuestion"
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

const rolePhraseKeywords: Record<MemberRole, string[]> = {
  WRITER: ["글 작가", "글작가", "소설 작가", "웹소설 작가", "스토리 작가", "플롯 작가", "세계관 작가", "대본 작가", "시나리오 작가", "원작 작가", "각색 작가", "글 담당", "원고 담당"],
  ILLUSTRATOR: [
    "그림 작가",
    "그림작가",
    "일러스트 작가",
    "일러스트레이터",
    "웹툰 작가",
    "만화 작가",
    "콘티 작가",
    "작화가",
    "작화 담당",
    "그림 담당",
    "배경 작가",
    "배경 일러스트",
    "표지 작가",
    "썸네일 작가",
    "키비주얼 작가",
    "캐릭터 디자이너",
    "캐릭터디자이너",
    "원화가",
    "애니메이터",
    "sd 캐릭터",
    "라이브2d",
  ],
  VOICE_ACTOR: ["성우", "목소리 담당", "보이스 배우", "더빙 성우", "내레이션 성우", "나레이션 성우", "보이스액터", "남성 성우", "여성 성우", "저음 성우", "감정 연기"],
  SOUND_DIRECTOR: ["사운드 디자이너", "사운드디자이너", "음향 감독", "음향 담당", "BGM 담당", "브금 담당", "ost 담당", "테마곡 담당", "작곡가", "효과음 담당", "음향효과", "믹싱 엔지니어", "폴리 아티스트"],
  PRODUCER: ["프로듀서", "기획자", "제작자", "연출자", "감독", "PM", "프로젝트 매니저"],
  EDITOR: ["편집자", "식자 담당", "교정 담당", "검수 담당", "자막 담당", "후반작업 담당"],
};

const roleExclusionPhrases = ["말고", "제외", "빼고", "필요 없어", "필요없", "나중", "후순위", "아니고"];

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

function detectPhraseRoles(source: string) {
  const normalizedSource = normalize(source);

  return Object.entries(rolePhraseKeywords)
    .filter(([, aliases]) => aliases.some((alias) => normalizedSource.includes(normalize(alias))))
    .map(([role]) => role as MemberRole);
}

function roleAliasesForDetection(role: MemberRole) {
  return unique([roleLabels[role], ...(rolePhraseKeywords[role] ?? []), ...(roleKeywords[role] ?? [])])
    .map((alias) => normalize(alias))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
}

function detectExcludedRoles(source: string) {
  const normalizedSource = normalize(source);

  return unique(
    Object.values(MemberRole).filter((role) =>
      roleAliasesForDetection(role).some((alias) =>
        roleExclusionPhrases.some((phrase) => {
          const normalizedPhrase = normalize(phrase);

          return normalizedSource.includes(`${alias} ${normalizedPhrase}`);
        }),
      ),
    ),
  );
}

function detectKeywordRoles(source: string) {
  const normalizedSource = normalize(source);
  const phraseRoles = detectPhraseRoles(source);
  const hasIllustratorPhrase = phraseRoles.includes("ILLUSTRATOR");
  const hasWriterPhrase = phraseRoles.includes("WRITER");
  const excludedRoles = detectExcludedRoles(source);

  const detectedRoles = Object.entries(roleKeywords)
    .filter(([, aliases]) => aliases.some((alias) => normalizedSource.includes(normalize(alias))))
    .map(([role]) => role as MemberRole);

  return detectedRoles.filter((role) => {
    if (excludedRoles.includes(role)) {
      return false;
    }

    if (role === "WRITER" && hasIllustratorPhrase && !hasWriterPhrase) {
      return false;
    }

    return true;
  });
}

function detectRoleNeeds(source: string, preferredRoles: MemberRole[]) {
  const excludedRoles = detectExcludedRoles(source);

  return unique([...detectPhraseRoles(source), ...detectKeywordRoles(source), ...preferredRoles])
    .filter((role) => !excludedRoles.includes(role));
}

function detectExplicitRoleNeeds(source: string) {
  const excludedRoles = detectExcludedRoles(source);

  return unique([...detectPhraseRoles(source), ...detectKeywordRoles(source)])
    .filter((role) => !excludedRoles.includes(role));
}

function extractKeywords(input: AiMatchingInput) {
  const source = normalize([input.projectDescription, ...(input.genres ?? [])].join(" "));
  const rawTokens = source.split(" ").filter((token) => token.length >= 2);
  const detectedTopics = detectTopics([input.projectDescription, ...(input.genres ?? [])].join(" ")).flatMap((topic) => [
    topic,
    ...(topicKeywords[topic] ?? []),
  ]);
  const detectedRoles = detectExplicitRoleNeeds([input.projectDescription, ...(input.genres ?? [])].join(" "))
    .flatMap((role) => roleKeywords[role] ?? []);

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
  const latestText = input.projectDescription.trim();

  if (detectReliableExplicitRoleNeeds(latestText).length > 0 || detectReliableExcludedRoles(latestText).length > 0) {
    return latestText;
  }

  const recentTexts = getRecentUserTexts(input);
  const projectSignals = unique([...recentTexts, latestText].filter(Boolean)).filter(
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
    "소설",
    "웹소설",
    "웹툰",
    "만화",
    "애니",
    "애니메이션",
    "오디오드라마",
    "장르",
    "아이디어",
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

  if (includesAny(source, ["업로드", "올려", "파일", "이미지", "오디오 파일", "작품 파일", "첨부", "저장공간", "스토리지", "용량"])) {
    return "uploadGuide";
  }

  if (includesAny(source, ["코인", "결제", "충전", "환불", "구독", "프리미엄", "열람권", "구매", "지갑", "광고 제거"])) {
    return "paymentGuide";
  }

  if (includesAny(source, ["구글플레이", "플레이스토어", "앱 출시", "앱 배포", "안드로이드", "aab", "apk", "번들", "버전코드", "테스터", "심사"])) {
    return "releaseGuide";
  }

  if (
    includesAny(source, ["기획", "기획서", "사업계획", "수익모델", "경쟁사", "차별화", "발표", "피드백", "평가", "어때", "로드맵", "시장성", "esg", "문제점", "개선"]) &&
    !includesAny(source, ["찾아줘", "추천", "어울리는", "맞는", "섭외"])
  ) {
    return "ideaCoach";
  }

  if (includesAny(source, ["사용법", "어디", "메뉴", "기능", "독자", "창작자", "스튜디오", "마이페이지", "알림", "고객센터", "신고", "스크랩", "이어보기"])) {
    return "platformGuide";
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

  if (!isMatchingRequest && source.length >= 8) {
    return "generalQuestion";
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

function buildKnowledgeAssistantMessage(intent: ConversationIntent, latestText: string, brief: ProjectBrief, memoryLine: string) {
  const remembered = memoryLine ? `\n\n${memoryLine}` : "";

  if (intent === "uploadGuide") {
    return `가능해요. 이 앱에서 작품 업로드는 “작품 파일을 올리고, 유료/무료 공개 범위와 참여자를 연결하는 흐름”으로 잡는 게 좋아요.${remembered}\n\n추천 흐름은 이렇게요.\n\n1. 작품 기본 정보: 제목, 형식, 장르, 소개문, 대표 이미지를 먼저 저장합니다.\n2. 파일 업로드: 소설 원고, 웹툰 이미지, 오디오 파일, 애니메이션 파일을 작품에 연결합니다.\n3. 공개 설정: 무료 미리보기, 코인 열람, 구독자 전용을 나눕니다.\n4. 팀 연결: 참여한 작가, 그림, 성우, BGM 담당자를 작품 크레딧과 정산 비율에 묶습니다.\n5. 검수 후 공개: 저작권/성인물/접근성 안내를 확인한 뒤 배포합니다.\n\n지금 단계에서는 큰 파일은 서버 DB에 직접 넣기보다 S3, Cloudflare R2, Supabase Storage 같은 파일 저장소에 올리고, DB에는 URL과 권한만 저장하는 구조가 가장 안전합니다.`;
  }

  if (intent === "paymentGuide") {
    return `코인/결제 쪽은 “사용자에게는 단순하게, 내부에는 거래 원장을 꼼꼼하게”가 핵심이에요.${remembered}\n\n권장 흐름은 이렇게 잡으면 됩니다.\n\n1. 코인 충전: 결제 성공 시 지갑 잔액을 증가시키고 거래 내역에 CHARGE로 기록합니다.\n2. 작품 열람: 작품 가격만큼 코인을 차감하고 열람권을 발급합니다.\n3. 자동 정산: 플랫폼 수수료 일반 13%, 파트너 8%를 차감한 뒤 팀원 지분율대로 분배합니다.\n4. 환불/오류 대응: 열람권 미발급, 중복 결제, 네트워크 실패는 거래 ID로 추적합니다.\n5. 구독: 프리미엄은 재결제일, 구독 상태, 해지 버튼이 항상 보이게 해야 합니다.\n\n실제 결제사를 붙일 때는 토스페이먼츠, 아임포트/포트원, Stripe 중 하나를 쓰고, 결제 완료 webhook에서만 코인을 충전하도록 만드는 게 안전합니다.`;
  }

  if (intent === "releaseGuide") {
    return `앱 출시 질문으로 이해했어요. 구글 플레이스토어 기준으로는 “버전 코드, 테스트 트랙, 개인정보처리방침 URL, 권한 설명”이 자주 막히는 지점입니다.${remembered}\n\n체크 순서는 이렇게 가면 좋아요.\n\n1. Android App Bundle(.aab)을 새 버전 코드로 빌드합니다.\n2. 내부 테스트 트랙에 국가/지역과 테스터를 지정합니다.\n3. 개인정보처리방침 URL이 실제 접속 가능해야 합니다.\n4. 앱 권한, 데이터 수집 항목, 12세 이상 이용 등급을 입력합니다.\n5. 이전 버전보다 낮은 versionCode를 올리지 않도록 확인합니다.\n\n이미 웹뷰 기반 앱이라면 배포 전에 휴대폰에서 회원가입, 로그인, 코인 충전, 작품 열람, 마이페이지 스크롤이 되는지 먼저 보는 게 제일 중요합니다.`;
  }

  if (intent === "ideaCoach") {
    return `기획 피드백 관점으로 보면, 지금 서비스는 “창작자 협업 + 콘텐츠 유통 + 자동 정산 + 배리어프리 확장”이 한 문장으로 잡혀야 강해져요.${remembered}\n\n답변 구조는 이렇게 쓰면 설득력이 좋아집니다.\n\n1. 문제: 창작자는 팀을 구하기 어렵고, 수익 분배에서 갈등이 생깁니다.\n2. 해결: 프로젝트 단위 매칭과 자동 정산으로 협업 부담을 줄입니다.\n3. 확장: 소설, 웹툰, 만화, 애니메이션, 오디오드라마를 하나의 IP로 묶습니다.\n4. 차별화: 단순 게시 플랫폼이 아니라 팀 구성부터 정산까지 이어지는 제작형 플랫폼입니다.\n5. 사회적 가치: 오디오/대본 싱크/고대비 UI로 접근성을 넓힙니다.\n\n발표에서는 기능을 많이 나열하기보다 “팀을 만들고, 작품을 팔고, 수익이 자동으로 나뉜다” 이 흐름을 먼저 보여주는 게 좋아요.`;
  }

  if (intent === "platformGuide") {
    return `서비스 사용법으로 답해볼게요. 크리에이터 유니버스는 독자 모드와 창작자 모드를 분리해서 이해하면 쉬워요.${remembered}\n\n독자는 이렇게 움직입니다.\n\n1. 작품에서 장르와 형식을 고릅니다.\n2. 마음에 드는 작품을 스크랩하거나 코인으로 열람합니다.\n3. 마이페이지에서 결제한 작품, 스크랩, 이어보기, 알림을 확인합니다.\n\n창작자는 이렇게 움직입니다.\n\n1. 스튜디오에서 프로필과 포트폴리오를 등록합니다.\n2. 매칭에서 팀원을 찾거나 제안을 받습니다.\n3. 작품을 업로드하고 참여자를 연결합니다.\n4. 정산에서 지분율과 지급 예정 금액을 확인합니다.\n\n질문이 “어느 화면에 넣을까?”라면, 독자가 자주 쓰는 건 하단 탭에 두고 창작자 전용 기능은 스튜디오 안에 묶는 편이 앱에서 덜 복잡합니다.`;
  }

  if (intent === "generalQuestion") {
    const shortQuestion = latestText.length > 80 ? `${latestText.slice(0, 80)}...` : latestText;

    return `좋아요. 이건 매칭 질문이 아니라 일반 대화/상담으로 보고 답할게요.${remembered}\n\n질문: “${shortQuestion}”\n\n제가 지금 할 수 있는 방식은 세 가지예요.\n\n1. 기획 관점으로 정리: 장단점, 우선순위, 발표용 문장으로 바꿔드릴 수 있어요.\n2. 제품 관점으로 정리: 앱 화면, 사용자 동선, 필요한 기능으로 쪼개드릴 수 있어요.\n3. 실행 관점으로 정리: 지금 바로 만들 수 있는 작업 순서로 바꿔드릴 수 있어요.\n\n단, 실시간 뉴스나 외부 정보를 확인해야 하는 질문은 제가 임의로 지어내지 않고 “확인 필요”라고 말할게요. 지금 질문은 먼저 핵심을 한 문장으로 잡고, 필요한 경우 기능/디자인/사업성 중 하나로 나눠서 이어가면 좋습니다.`;
  }

  return null;
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
  const knowledgeMessage = buildKnowledgeAssistantMessage(intent, latestText, brief, memoryLine);

  if (knowledgeMessage) {
    return knowledgeMessage;
  }

  if (!top) {
    const requestedRoles = detectExplicitRoleNeeds(latestText).map((role) => roleLabels[role]);
    const roleHint = requestedRoles.length > 0
      ? `요청한 ${requestedRoles.join(", ")} 직군의 공개 프로필이 아직 부족해요.`
      : "아직 공개된 매칭 프로필만으로는 확실한 후보를 못 고르겠어요.";

    return `${contextPrefix}${roleHint}\n\n${memoryLine ? `${memoryLine}\n\n` : ""}지금 방향은 ${brief.tone} 쪽이라서, 팀원 찾기에 ${brief.neededRoles.join(", ")} 포지션 프로필이 더 등록되면 추천 정확도가 올라가요.\n\n지금은 작품 설명을 조금 더 구체화하거나, 매칭 보드에서 해당 직군 창작자에게 프로필 등록을 먼저 유도하는 흐름이 안전합니다.`;
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

  if (intent === "uploadGuide") {
    return ["작품 업로드 화면 구성도 짜줘", "오디오 파일 저장 구조를 설명해줘", "무료/유료 공개 설정을 어떻게 나눌까?"];
  }

  if (intent === "paymentGuide") {
    return ["코인 충전 오류를 줄이는 구조를 알려줘", "프리미엄 구독 화면 문구를 써줘", "실제 결제사 붙이는 순서를 알려줘"];
  }

  if (intent === "releaseGuide") {
    return ["구글 플레이 출시 체크리스트를 만들어줘", "AAB 버전 코드 실수 방지법 알려줘", "테스터 배포 순서를 정리해줘"];
  }

  if (intent === "ideaCoach") {
    return ["기획 발표용 한 문장으로 줄여줘", "경쟁사 대비 차별점을 정리해줘", "MVP 우선순위를 다시 짜줘"];
  }

  if (intent === "platformGuide" || intent === "generalQuestion") {
    return ["독자 입장에서 더 쉽게 설명해줘", "창작자 입장에서 필요한 기능을 정리해줘", "바로 만들 작업 순서로 바꿔줘"];
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
    providersUsed: [],
    assistantMessage: buildAssistantMessage(input, recommendations),
    projectBrief: brief,
    recommendations,
    followUpSuggestions: buildFollowUpSuggestions(brief),
  };
}

const cleanRoleLabels: Record<MemberRole, string> = {
  WRITER: "글",
  ILLUSTRATOR: "그림",
  VOICE_ACTOR: "목소리",
  SOUND_DIRECTOR: "BGM",
  PRODUCER: "프로듀서",
  EDITOR: "에디터",
};

const cleanRoleKeywords: Record<MemberRole, string[]> = {
  WRITER: ["글", "작가", "소설", "웹소설", "대본", "시나리오", "각색", "플롯", "세계관", "문장", "스토리", "원고"],
  ILLUSTRATOR: [
    "그림",
    "일러스트",
    "웹툰",
    "만화",
    "콘티",
    "표지",
    "키비주얼",
    "캐릭터",
    "채색",
    "배경",
    "애니메이터",
    "애니메이션",
    "원화",
    "동화",
    "라이브2d",
  ],
  VOICE_ACTOR: ["목소리", "성우", "보이스", "더빙", "내레이션", "감정연기", "저음", "남성 성우", "여성 성우"],
  SOUND_DIRECTOR: ["bgm", "브금", "사운드", "음향", "효과음", "믹싱", "앰비언트", "asmr", "ost", "테마곡", "소리"],
  PRODUCER: ["프로듀서", "기획", "pm", "연출", "제작관리", "프로젝트 매니저"],
  EDITOR: ["편집", "식자", "교정", "검수", "마감", "에디터"],
};

const cleanRolePhrases: Record<MemberRole, string[]> = {
  WRITER: ["글 작가", "소설 작가", "웹소설 작가", "대본 작가", "시나리오 작가", "스토리 작가", "플롯 작가", "세계관 작가", "원고 담당"],
  ILLUSTRATOR: [
    "그림 작가",
    "일러스트 작가",
    "웹툰 작가",
    "만화 작가",
    "콘티 작가",
    "표지 작가",
    "배경 작가",
    "키비주얼 작가",
    "캐릭터 디자이너",
    "애니메이터",
    "원화가",
    "라이브2d",
  ],
  VOICE_ACTOR: ["성우", "목소리 담당", "보이스 배우", "더빙 성우", "내레이션 성우", "감정 연기", "남성 성우", "여성 성우", "저음 성우"],
  SOUND_DIRECTOR: ["사운드 디자이너", "사운드디자이너", "음향 감독", "음향 담당", "bgm 담당", "브금 담당", "ost 담당", "테마곡 담당", "효과음 담당", "믹싱 엔지니어"],
  PRODUCER: ["프로듀서", "기획자", "제작자", "연출자", "프로젝트 매니저"],
  EDITOR: ["편집자", "식자 담당", "교정 담당", "검수 담당", "에디터"],
};

const cleanRoleExclusionPhrases = ["말고", "제외", "빼고", "필요 없어", "필요없", "나중", "후순위", "아니고"];

const cleanTopicKeywords: Record<string, string[]> = {
  로맨스: ["로맨스", "연애", "감정선", "청춘"],
  판타지: ["판타지", "마법", "세계관", "모험", "이세계"],
  미스터리: ["미스터리", "추리", "괴담", "도시괴담", "비밀", "사건"],
  스릴러: ["스릴러", "긴장", "공포", "추격", "서스펜스"],
  일상: ["일상", "성장", "동네", "카페", "생활"],
  힐링: ["힐링", "치유", "감성", "잔잔", "asmr"],
  오디오드라마: ["오디오드라마", "오디오 드라마", "보이스드라마", "대본 싱크", "입체음향"],
  애니메이션: ["애니메이션", "애니", "숏폼", "파일럿", "티저", "원화", "동화"],
  웹툰: ["웹툰", "세로스크롤", "콘티", "채색"],
  소설: ["소설", "웹소설", "원고", "챕터"],
};

function cleanNormalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanRoleAliases(role: MemberRole) {
  return unique([cleanRoleLabels[role], ...(cleanRolePhrases[role] ?? []), ...(cleanRoleKeywords[role] ?? [])])
    .map((alias) => cleanNormalize(alias))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
}

function detectCleanExcludedRoles(source: string) {
  const normalizedSource = cleanNormalize(source);

  return unique(
    Object.values(MemberRole).filter((role) =>
      cleanRoleAliases(role).some((alias) =>
        cleanRoleExclusionPhrases.some((phrase) => normalizedSource.includes(`${alias} ${cleanNormalize(phrase)}`)),
      ),
    ),
  );
}

function detectCleanPhraseRoles(source: string) {
  const normalizedSource = cleanNormalize(source);

  return Object.entries(cleanRolePhrases)
    .filter(([, aliases]) => aliases.some((alias) => normalizedSource.includes(cleanNormalize(alias))))
    .map(([role]) => role as MemberRole);
}

function detectCleanKeywordRoles(source: string) {
  const normalizedSource = cleanNormalize(source);
  const phraseRoles = detectCleanPhraseRoles(source);
  const excludedRoles = detectCleanExcludedRoles(source);
  const hasIllustratorPhrase = phraseRoles.includes("ILLUSTRATOR");
  const hasWriterPhrase = phraseRoles.includes("WRITER");

  return unique(
    Object.entries(cleanRoleKeywords)
      .filter(([, aliases]) => aliases.some((alias) => normalizedSource.includes(cleanNormalize(alias))))
      .map(([role]) => role as MemberRole),
  ).filter((role) => {
    if (excludedRoles.includes(role)) {
      return false;
    }

    return !(role === "WRITER" && hasIllustratorPhrase && !hasWriterPhrase);
  });
}

function detectCleanExplicitRoleNeeds(source: string) {
  const excludedRoles = detectCleanExcludedRoles(source);

  return unique([...detectCleanPhraseRoles(source), ...detectCleanKeywordRoles(source)]).filter((role) => !excludedRoles.includes(role));
}

const reliableRoleLabels: Record<MemberRole, string> = {
  WRITER: "글",
  ILLUSTRATOR: "그림",
  VOICE_ACTOR: "목소리",
  SOUND_DIRECTOR: "BGM",
  PRODUCER: "프로듀서",
  EDITOR: "에디터",
};

const reliableRoleKeywords: Record<MemberRole, string[]> = {
  WRITER: ["글", "작가", "소설", "웹소설", "스토리", "대본", "시나리오", "원고", "플롯", "세계관", "각색"],
  ILLUSTRATOR: ["그림", "일러스트", "일러스트레이터", "웹툰", "만화", "콘티", "표지", "키비주얼", "작화", "채색", "원화", "동화", "애니메이터", "애니메이션", "캐릭터"],
  VOICE_ACTOR: ["목소리", "성우", "보이스", "더빙", "내레이션", "나레이션", "대사", "감정연기", "오디오 연기"],
  SOUND_DIRECTOR: ["bgm", "브금", "사운드", "사운드디자이너", "사운드 디자이너", "음향", "효과음", "믹싱", "작곡", "ost", "테마곡", "폴리", "앰비언트", "asmr"],
  PRODUCER: ["프로듀서", "기획", "pm", "연출", "감독", "제작관리", "프로젝트 매니저"],
  EDITOR: ["편집", "식자", "교정", "검수", "자막", "에디터"],
};

const reliableRolePhrases: Record<MemberRole, string[]> = {
  WRITER: ["글 작가", "소설 작가", "웹소설 작가", "스토리 작가", "대본 작가", "시나리오 작가", "원고 담당", "플롯 작가"],
  ILLUSTRATOR: ["그림 작가", "일러스트 작가", "일러스트레이터", "웹툰 작가", "만화 작가", "콘티 작가", "표지 작가", "키비주얼 작가", "원화가", "애니메이터", "캐릭터 디자이너"],
  VOICE_ACTOR: ["성우", "목소리 담당", "보이스 배우", "더빙 성우", "내레이션 성우", "감정 연기"],
  SOUND_DIRECTOR: ["사운드 디자이너", "사운드디자이너", "음향 감독", "음향 담당", "BGM 담당", "브금 담당", "OST 담당", "테마곡 담당", "작곡가", "효과음 담당", "믹싱 엔지니어", "폴리 아티스트"],
  PRODUCER: ["프로듀서", "기획자", "제작자", "연출자", "프로젝트 매니저"],
  EDITOR: ["편집자", "식자 담당", "교정 담당", "검수 담당", "자막 담당"],
};

const reliableRoleExclusionPhrases = ["말고", "제외", "빼고", "필요 없어", "필요없", "나중", "후순위", "아니고"];

function getReliableRoleDetectionSource(source: string) {
  const markers = ["지금은", "이번엔", "이번에는", "현재는", "이번 질문은", "다음은"];
  const normalizedSource = source.toLowerCase();
  const markerIndex = markers.reduce((latestIndex, marker) => {
    const index = normalizedSource.lastIndexOf(marker);

    return index > latestIndex ? index : latestIndex;
  }, -1);

  return markerIndex >= 0 ? source.slice(markerIndex) : source;
}

function reliableRoleAliases(role: MemberRole) {
  return unique([reliableRoleLabels[role], ...(reliableRolePhrases[role] ?? []), ...(reliableRoleKeywords[role] ?? [])])
    .map((alias) => cleanNormalize(alias))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
}

function detectReliableExcludedRoles(source: string) {
  return detectMatchingExcludedRoles(source) as MemberRole[];
}

function detectReliablePhraseRoles(source: string) {
  const normalizedSource = cleanNormalize(getReliableRoleDetectionSource(source));

  return Object.entries(reliableRolePhrases)
    .filter(([, aliases]) => aliases.some((alias) => normalizedSource.includes(cleanNormalize(alias))))
    .map(([role]) => role as MemberRole);
}

function detectReliableKeywordRoles(source: string) {
  const normalizedSource = cleanNormalize(getReliableRoleDetectionSource(source));
  const phraseRoles = detectReliablePhraseRoles(source);
  const excludedRoles = detectReliableExcludedRoles(source);
  const hasIllustratorPhrase = phraseRoles.includes("ILLUSTRATOR");
  const hasWriterPhrase = phraseRoles.includes("WRITER");

  return unique(
    Object.entries(reliableRoleKeywords)
      .filter(([, aliases]) => aliases.some((alias) => normalizedSource.includes(cleanNormalize(alias))))
      .map(([role]) => role as MemberRole),
  ).filter((role) => {
    if (excludedRoles.includes(role)) {
      return false;
    }

    return !(role === "WRITER" && hasIllustratorPhrase && !hasWriterPhrase);
  });
}

function detectReliableExplicitRoleNeeds(source: string) {
  return detectMatchingRoles(source) as MemberRole[];
}

function detectRequestedRecommendationLimit(source: string) {
  return detectMatchingLimit(source);
}

function detectCleanTopics(source: string) {
  const normalizedSource = cleanNormalize(source);

  return Object.entries(cleanTopicKeywords)
    .filter(([topic, aliases]) => normalizedSource.includes(cleanNormalize(topic)) || aliases.some((alias) => normalizedSource.includes(cleanNormalize(alias))))
    .map(([topic]) => topic);
}

function buildCleanKeywords(input: AiMatchingInput) {
  const source = [input.projectDescription, ...(input.genres ?? [])].join(" ");
  const rawTokens = cleanNormalize(source).split(" ").filter((token) => token.length >= 2);
  const topicTokens = detectCleanTopics(source).flatMap((topic) => [topic, ...(cleanTopicKeywords[topic] ?? [])]);
  const roleTokens = detectReliableExplicitRoleNeeds(source).flatMap((role) => reliableRoleKeywords[role] ?? []);

  return unique([...rawTokens, ...topicTokens, ...roleTokens, ...(input.genres ?? [])]).slice(0, 36);
}

function buildCleanTone(projectDescription: string, topics: string[]) {
  const source = cleanNormalize(projectDescription);

  if (topics.includes("미스터리") || source.includes("괴담") || /비가?\s*오는|비가\s*내리는/.test(source)) {
    return "어두운 미스터리와 몰입감이 중요한 분위기";
  }

  if (topics.includes("로맨스")) {
    return "감정선과 캐릭터 케미가 중요한 로맨스 무드";
  }

  if (topics.includes("힐링") || topics.includes("일상")) {
    return "잔잔하고 오래 머무는 감성";
  }

  if (topics.includes("애니메이션")) {
    return "비주얼 연출과 사운드 확장이 중요한 애니메이션 무드";
  }

  return "멀티 콘텐츠로 확장하기 좋은 작품 분위기";
}

function buildCleanBrief(input: AiMatchingInput): ProjectBrief {
  const context = resolveMatchingContext(input);
  const topics = context.topics;
  const neededRoles = context.roles.map(role => reliableRoleLabels[role as MemberRole]);
  const tone = buildCleanTone(resolveMatchingContext(input).source, topics);

  return {
    summary: neededRoles.length ? `${tone}에 맞는 ${neededRoles.join(", ")} 후보를 비교했어요.` : `${tone}로 읽었어요. 필요한 직군을 알려주면 더 정확하게 좁힐 수 있어요.`,
    tone,
    topics,
    neededRoles,
  };
}

function cleanWeightedMatches(text: string, keywords: string[], weight: number) {
  const normalizedText = cleanNormalize(text);
  const matches = keywords.filter((keyword) => normalizedText.includes(cleanNormalize(keyword)));

  return {
    score: matches.length * weight,
    matches,
  };
}

function buildCleanReasonDetails(input: {
  role: MemberRole;
  matchedKeywords: string[];
  preferredRoleMatched: boolean;
  responseRate: number;
  completedProjects: number;
}) {
  const details = [];

  if (input.preferredRoleMatched) {
    details.push(`요청한 직군과 ${reliableRoleLabels[input.role]} 역할이 정확히 맞습니다.`);
  }

  if (input.matchedKeywords.length > 0) {
    details.push(`${input.matchedKeywords.slice(0, 4).join(", ")} 키워드가 공개 포트폴리오와 겹칩니다.`);
  }

  if (input.responseRate >= 90) {
    details.push(`응답률 ${input.responseRate}%라서 협업 상담을 빠르게 시작하기 좋습니다.`);
  }

  if (input.completedProjects > 0) {
    details.push(`완료 프로젝트 ${input.completedProjects}건의 협업 경험이 있습니다.`);
  }

  return details.length > 0 ? details : ["공개 프로필의 역할, 활동성, 포트폴리오 정보를 기준으로 추천했습니다."];
}

function buildCleanSuggestedMessage(projectDescription: string, creatorName: string, role: MemberRole, matchedKeywords: string[]) {
  const keywordText = matchedKeywords.length > 0 ? matchedKeywords.slice(0, 3).join(", ") : "공개 포트폴리오";

  return `${creatorName}님, 제 작품 방향과 ${keywordText} 결이 잘 맞아 보여서 ${reliableRoleLabels[role]} 포지션으로 협업 상담을 드리고 싶습니다. 가능하시다면 작업 범위와 일정부터 짧게 이야기해보고 싶어요.`;
}

function buildCleanRankedBlock(recommendations: CreatorRecommendation[]) {
  return recommendations
    .slice(0, 3)
    .map((item) => {
      const keywordText = item.matchedKeywords.length > 0 ? item.matchedKeywords.slice(0, 4).join(", ") : "공개 포트폴리오와 협업 지표";

      return `${item.rank}순위. ${item.creator.displayName}님 (${reliableRoleLabels[item.creator.primaryRole]})\n- 추천 이유: ${item.reason}\n- 근거: ${item.reasonDetails.slice(0, 2).join(" ")}\n- 맞는 키워드: ${keywordText}`;
    })
    .join("\n\n");
}

function matchingIntent(text: string): ConversationIntent {
  const source = normalize(text);
  if (includesAny(source, ["비교", "누가 더", "누구가 더", "두 사람 차이"])) return "compare";
  if (includesAny(source, ["dm", "디엠", "메시지", "보낼 말", "문구"])) return "message";
  if (includesAny(source, ["정산", "지분", "수수료", "수익"])) return "settlement";
  if (includesAny(source, ["근거", "이유", "왜 추천"])) return "explain";
  if (includesAny(source, ["찾아", "추천", "골라", "섭외"])) return "recommend";
  const intent = getConversationIntent(text);
  if (intent === "generalQuestion" && matchingReviewTags(text).length) return "recommend";
  return intent;
}

function reviewedReason(item: CreatorRecommendation) {
  return item.reviewEvidence?.length
    ? `${item.reason} 함께 살펴볼 프로필 키워드는 ${item.reviewEvidence.join(" · ")}입니다.`
    : item.reason;
}

function buildMatchingMessage(input: AiMatchingInput, brief: ProjectBrief, intent: ConversationIntent, items: CreatorRecommendation[]) {
  if (intent === "paymentGuide") {
    return "코인은 결제 메뉴에서 충전합니다. 카드 결제 준비 중으로 표시되면 아직 충전할 수 없어요. 승인이 확인된 충전은 지갑 내역에 반영됩니다. 중복 결제나 취소는 주문번호와 함께 고객센터에 문의해 주세요.";
  }
  if (intent === "settlement") {
    return "작품 구매 수익은 플랫폼 수수료(일반 13%, 파트너 8%)를 차감한 뒤 합의한 지분율로 나눕니다. 제안서에는 각자 맡을 작업과 수정 범위, 지분율, 주 단위 정산 일정을 함께 적어 보세요.";
  }
  if (intent === "greeting" || intent === "smallTalk") {
    return "어떤 작품의 팀원을 찾고 계세요? 장르와 맡길 작업을 알려주세요. 예를 들어 ‘도시괴담 오디오드라마에서 속삭이는 장면을 맡을 성우’처럼 적으면 공개 프로필의 근거를 비교해 드릴게요.";
  }
  const knowledge = buildKnowledgeAssistantMessage(intent, input.projectDescription, brief, "");
  if (knowledge) return knowledge;
  const [first, second] = items;
  if (!first) {
    return `현재 조건에 맞는 ${brief.neededRoles.join(" · ") || "창작자"} 공개 프로필이 없습니다. 직군이나 장르 조건을 바꾸거나 필요한 작업을 적어 모집 공고를 만들어 보세요.`;
  }
  if (intent === "compare") {
    if (!second) return `비교할 수 있는 후보는 현재 ${first.creator.displayName}님 한 명입니다. ${reviewedReason(first)}`;
    return items.map(item => `${item.creator.displayName}님 · ${reliableRoleLabels[item.creator.primaryRole]}\n${reviewedReason(item)} ${item.matchSignals?.find(s => s.label === "협업 기록")?.detail ?? ""}`.trim()).join("\n\n");
  }
  if (intent === "message" || intent === "toneChange") {
    return `${first.creator.displayName}님에게 보낼 제안 초안이에요.\n\n“${first.suggestedMessage}”`;
  }
  if (intent === "explain" || intent === "shorten") return `${first.creator.displayName}님 · ${reviewedReason(first)}\n${first.reasonDetails.join(" / ")}`;
  if (intent === "nextStep") return `${first.creator.displayName}님에게 작업 범위와 희망 일정을 먼저 보내 보세요. 회신을 받은 뒤 시안, 수정 횟수, 수익 배분을 함께 정하면 됩니다.`;
  if (intent === "confusion" || intent === "clarify") return `지금까지 알려주신 조건은 ${[...brief.neededRoles, ...brief.topics].join(" · ") || "아직 구체화되지 않았어요"}. 어떤 작업을 먼저 맡길지 알려주시면 후보를 다시 좁혀 볼게요.`;
  return [brief.summary, ...items.map(item => `${item.rank}순위. ${item.creator.displayName}님 (${reliableRoleLabels[item.creator.primaryRole]})\n${reviewedReason(item)}`)].join("\n\n");
}

function buildCleanFollowUps(input: AiMatchingInput, recommendations: CreatorRecommendation[]) {
  const top = recommendations[0];
  const second = recommendations[1];

  if (!top) {
    return ["매칭 공고 문구 만들어줘", "필요한 역할을 다시 정리해줘", "비슷한 다른 직군도 볼 수 있을까?"];
  }

  return [
    `${top.creator.displayName}님에게 보낼 DM 써줘`,
    second ? `${top.creator.displayName}님과 ${second.creator.displayName}님 비교해줘` : "왜 1순위인지 자세히 알려줘",
    "13% 수수료와 지분 제안까지 넣어줘",
  ];
}

async function loadMatchingProfiles() {
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

  return profiles.map(profile => ({
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
  }));
}

type Profile = CreatorRecommendation["creator"];

function namedProfiles(text: string, profiles: Profile[]) {
  const mentions = profiles.map(profile => ({ profile, index: text.indexOf(profile.displayName) }))
    .filter(item => item.index >= 0 && item.profile.displayName.trim())
    .sort((a, b) => a.index - b.index || b.profile.displayName.length - a.profile.displayName.length);
  const matches: Profile[] = [];
  let end = -1;
  for (const { profile, index } of mentions) {
    if (index < end) continue;
    matches.push(profile);
    end = index + profile.displayName.length;
  }
  return matches;
}

function referencedProfiles(input: AiMatchingInput, profiles: Profile[], intent: ConversationIntent) {
  if (!["compare", "explain", "message", "shorten", "toneChange", "nextStep"].includes(intent)) return [];
  const explicit = namedProfiles(input.projectDescription, profiles);
  if (explicit.length) return explicit;
  for (const message of [...input.messages ?? []].reverse()) {
    if (message.role !== "assistant") continue;
    const previous = namedProfiles(message.content, profiles);
    if (!previous.length) continue;
    const ordinals = Array.from(input.projectDescription.matchAll(/([1-6])\s*순위/g), match => Number(match[1]) - 1);
    return ordinals.length ? unique(ordinals).map(index => previous[index]).filter(Boolean) : previous;
  }
  return [];
}

async function buildReviewedResponse(input: AiMatchingInput, profiles: Profile[], chat: boolean): Promise<AiMatchingResponse> {
  const brief = buildCleanBrief(input);
  const intent = chat ? matchingIntent(input.projectDescription) : "recommend";
  const context = resolveMatchingContext(input);
  const referenced = referencedProfiles(input, profiles, intent);
  const baseline = rankMatchingCreators(profiles, context);
  let recommendations: CreatorRecommendation[] = baseline;
  let providersUsed: MatchingProvider[] = [];
  let providerNote = "공개 프로필과 작품 조건을 기준으로 매칭했습니다.";
  if (referenced.length) {
    // Preserve the people the user asked to discuss, including the earlier order
    // for “2순위에게 DM”, without sending names or chat history to providers.
    const eligible = rankMatchingCreators(referenced, { ...context, limit: referenced.length });
    recommendations = referenced.flatMap(profile => eligible.filter(item => item.creator.userId === profile.userId))
      .map((item, i) => ({ ...item, rank: i + 1 }));
    providerNote = "대화에서 지정한 후보의 공개 프로필을 확인했습니다.";
  } else if (["recommend", "refine", "rolePriority", "compare", "explain"].includes(intent) && baseline.length) {
    const shortlist = rankMatchingCreators(profiles, { ...context, limit: 8 });
    const review = await reviewMatchingShortlist(context, input.genres ?? [], shortlist, baseline);
    recommendations = review.recommendations;
    providersUsed = review.providersUsed;
    if (providersUsed.length) providerNote = "공개 프로필에서 확인한 작업 키워드를 바탕으로 후보 순서를 검토했습니다.";
  }
  return {
    provider: providersUsed.length > 1 ? "ensemble" : providersUsed[0] ?? "local",
    providersUsed, providerNote, projectBrief: brief, recommendations,
    assistantMessage: buildMatchingMessage(input, brief, intent, recommendations),
    followUpSuggestions: buildCleanFollowUps(input, recommendations),
  };
}

export async function recommendCreatorsForProject(input: AiMatchingInput) {
  return buildReviewedResponse(input, await loadMatchingProfiles(), false);
}

export async function createAiMatchingChat(input: AiMatchingInput) {
  return buildReviewedResponse(input, await loadMatchingProfiles(), true);
}

export const __aiMatchingTestUtils = {
  buildReviewedResponse,
  detectExplicitRoleNeeds: detectReliableExplicitRoleNeeds,
  detectExcludedRoles: detectReliableExcludedRoles,
  detectRequestedLimit: detectRequestedRecommendationLimit,
  detectRoleNeeds: (source: string, preferredRoles: MemberRole[]) =>
    unique([...detectReliableExplicitRoleNeeds(source), ...preferredRoles]).filter((role) => !detectReliableExcludedRoles(source).includes(role)),
};
