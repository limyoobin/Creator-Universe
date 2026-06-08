import { MemberRole } from "@prisma/client";
import { __aiMatchingTestUtils } from "../src/services/ai-matching.service.js";

type SmokeCase = {
  name: string;
  prompt: string;
  includes: MemberRole[];
  excludes?: MemberRole[];
  limit?: number;
};

const cases: SmokeCase[] = [
  {
    name: "그림 작가 요청은 글 작가로 새지 않음",
    prompt: "글 작가 말고 웹툰 콘티와 표지까지 가능한 그림 작가만 추천해줘.",
    includes: [MemberRole.ILLUSTRATOR],
    excludes: [MemberRole.WRITER],
  },
  {
    name: "사운드 디자이너 요청은 BGM 직군으로 해석",
    prompt: "어두운 미스터리 오디오드라마에 맞는 사운드 디자이너나 BGM 담당이 있을까?",
    includes: [MemberRole.SOUND_DIRECTOR],
  },
  {
    name: "성우 제외 조건은 목소리 직군을 제외",
    prompt: "성우 말고 표지 작가 찾아줘. 캐릭터 러프랑 키비주얼 잘하는 사람이면 좋겠어.",
    includes: [MemberRole.ILLUSTRATOR],
    excludes: [MemberRole.VOICE_ACTOR],
  },
  {
    name: "웹소설 작가는 글 직군",
    prompt: "로맨스 판타지 웹소설 작가를 찾고 있어.",
    includes: [MemberRole.WRITER],
  },
  {
    name: "애니메이터는 그림/비주얼 직군",
    prompt: "숏폼 애니메이션 파일럿에 맞는 애니메이터랑 원화가가 필요해.",
    includes: [MemberRole.ILLUSTRATOR],
  },
  {
    name: "최신 질문의 사운드 요청은 사운드 직군",
    prompt: "전에 글 그림 작가를 봤는데, 지금은 사운드 디자이너 매칭 있나? 추천해줄 사람 있나?",
    includes: [MemberRole.SOUND_DIRECTOR],
  },
  {
    name: "글 작가 한 명만 요청은 글 직군과 1명 제한",
    prompt: "감성 로맨스 웹소설에 맞는 글 작가 한 명만 추천해줘.",
    includes: [MemberRole.WRITER],
    limit: 1,
  },
  {
    name: "성우 제외 후 글 작가 한 명만 요청",
    prompt: "성우 말고 글 작가 한명만 추천해줘. 대본 각색 가능한 사람이면 좋아.",
    includes: [MemberRole.WRITER],
    excludes: [MemberRole.VOICE_ACTOR],
    limit: 1,
  },
];

const failures: string[] = [];

for (const testCase of cases) {
  const detectedRoles = __aiMatchingTestUtils.detectExplicitRoleNeeds(testCase.prompt);
  const excludedRoles = __aiMatchingTestUtils.detectExcludedRoles(testCase.prompt);

  for (const role of testCase.includes) {
    if (!detectedRoles.includes(role)) {
      failures.push(`${testCase.name}: expected ${role}, got ${detectedRoles.join(", ") || "none"}`);
    }
  }

  for (const role of testCase.excludes ?? []) {
    if (detectedRoles.includes(role) || !excludedRoles.includes(role)) {
      failures.push(
        `${testCase.name}: expected ${role} to be excluded. detected=${detectedRoles.join(", ") || "none"} excluded=${excludedRoles.join(", ") || "none"}`,
      );
    }
  }

  if (testCase.limit !== undefined) {
    const detectedLimit = __aiMatchingTestUtils.detectRequestedLimit(testCase.prompt);
    if (detectedLimit !== testCase.limit) {
      failures.push(`${testCase.name}: expected limit ${testCase.limit}, got ${detectedLimit ?? "none"}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`AI matching smoke passed: ${cases.length} cases`);
