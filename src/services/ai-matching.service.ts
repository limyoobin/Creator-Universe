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

const roleLabels: Record<MemberRole, string> = {
  WRITER: "글",
  ILLUSTRATOR: "그림",
  VOICE_ACTOR: "목소리",
  SOUND_DIRECTOR: "BGM",
  PRODUCER: "프로듀서",
  EDITOR: "에디터",
};

const roleKeywords: Record<MemberRole, string[]> = {
  WRITER: ["글", "작가", "소설", "웹소설", "대본", "시나리오", "스토리", "각색", "콘티", "문장"],
  ILLUSTRATOR: ["그림", "일러스트", "웹툰", "만화", "캐릭터", "표지", "키비주얼", "채색", "작화", "러프"],
  VOICE_ACTOR: ["목소리", "성우", "보이스", "더빙", "내레이션", "연기", "오디오", "저음", "대사", "감정"],
  SOUND_DIRECTOR: ["bgm", "사운드", "음악", "효과음", "믹싱", "앰비언트", "asmr", "입체음향", "소리"],
  PRODUCER: ["프로듀서", "기획", "PM", "운영", "제작관리", "프로젝트"],
  EDITOR: ["편집", "식자", "교정", "검수", "편집자"],
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
    `${roleText} 중에서 먼저 섭외할 사람을 골라줘`,
    "추천 후보에게 보낼 첫 메시지를 써줘",
    "13% 수수료와 30:30:40 지분 기준으로 제안 문구를 만들어줘",
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
  return recommendCreatorsForProject(input);
}
