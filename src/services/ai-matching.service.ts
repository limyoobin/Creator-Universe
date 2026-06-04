import { MemberRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type AiMatchingInput = {
  projectDescription: string;
  preferredRoles?: MemberRole[];
  genres?: string[];
  limit?: number;
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
  WRITER: ["글", "작가", "소설", "웹소설", "대본", "시나리오", "스토리", "각색", "콘티"],
  ILLUSTRATOR: ["그림", "일러스트", "웹툰", "만화", "캐릭터", "표지", "키비주얼", "채색", "작화"],
  VOICE_ACTOR: ["목소리", "성우", "보이스", "더빙", "내레이션", "연기", "오디오", "대사"],
  SOUND_DIRECTOR: ["bgm", "사운드", "음악", "효과음", "믹싱", "앰비언트", "asmr", "입체음향"],
  PRODUCER: ["프로듀서", "기획", "팀장", "운영", "제작관리", "프로젝트"],
  EDITOR: ["편집", "식자", "교정", "검수", "편집자"],
};

const topicKeywords: Record<string, string[]> = {
  로맨스: ["로맨스", "연애", "청춘", "짝사랑", "감정선", "설렘"],
  판타지: ["판타지", "마법", "용", "세계관", "모험", "이세계"],
  미스터리: ["미스터리", "추리", "괴담", "도시괴담", "사건", "비밀"],
  스릴러: ["스릴러", "긴장", "공포", "추격", "서스펜스", "위험"],
  일상: ["일상", "성장", "학교", "카페", "생활", "잔잔"],
  힐링: ["힐링", "따뜻", "감성", "위로", "잔잔", "asmr"],
  BL: ["bl", "비엘", "청춘", "관계성", "팬덤"],
  웹툰: ["웹툰", "세로스크롤", "콘티", "작화", "채색"],
  소설: ["소설", "웹소설", "문장", "대본", "챕터"],
  오디오: ["오디오", "성우", "보이스", "대본 싱크", "입체음향", "사운드"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function extractKeywords(input: AiMatchingInput) {
  const source = normalize([input.projectDescription, ...(input.genres ?? [])].join(" "));
  const rawTokens = source.split(" ").filter((token) => token.length >= 2);
  const detectedTopics = Object.entries(topicKeywords)
    .filter(([topic, aliases]) => source.includes(normalize(topic)) || aliases.some((alias) => source.includes(normalize(alias))))
    .flatMap(([topic, aliases]) => [topic, ...aliases]);
  const detectedRoles = Object.entries(roleKeywords)
    .filter(([, aliases]) => aliases.some((alias) => source.includes(normalize(alias))))
    .flatMap(([, aliases]) => aliases);

  return unique([...rawTokens, ...detectedTopics, ...detectedRoles, ...(input.genres ?? [])])
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 32);
}

function weightedMatches(text: string, keywords: string[], weight: number) {
  const normalizedText = normalize(text);
  const matches = keywords.filter((keyword) => normalizedText.includes(normalize(keyword)));

  return {
    score: matches.length * weight,
    matches,
  };
}

function buildReason(role: MemberRole, matches: string[], preferredRoleMatched: boolean) {
  const topKeywords = matches.slice(0, 4);
  const roleText = `${roleLabels[role]} 역할`;

  if (topKeywords.length >= 2 && preferredRoleMatched) {
    return `${roleText}과 요청한 작업 방향이 맞고, ${topKeywords.join(", ")} 키워드가 포트폴리오와 겹칩니다.`;
  }

  if (topKeywords.length > 0) {
    return `${topKeywords.join(", ")} 분위기의 작업 이력이 보여서 이번 프로젝트와 연결성이 높습니다.`;
  }

  return `${roleText} 기반의 협업 경험과 응답률을 기준으로 추천했습니다.`;
}

export async function recommendCreatorsForProject(input: AiMatchingInput) {
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

  return profiles
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

      return {
        rank: 0,
        score: Math.round(score),
        matchRate: Math.max(42, Math.min(98, Math.round(52 + score * 0.72))),
        reason: buildReason(profile.primaryRole, matchedKeywords, preferredRoleMatched),
        matchedKeywords,
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
}
