import assert from "node:assert/strict";
import { detectMatchingRoles, detectMatchingExcludedRoles, detectMatchingLimit, resolveMatchingContext, rankMatchingCreators, type MatchableCreator } from "../shared/creator-matching.js";

let passed = 0;
function test(name: string, check: () => void) { check(); passed++; console.log(`PASS ${name}`); }
const creator = (id: string, role: string, text: string, responseRate = 80, completedProjects = 5): MatchableCreator => ({
  userId: id, displayName: id, primaryRole: role, headline: text, bio: text, skills: [text], responseRate, completedProjects,
});
const candidates = [
  creator("미스터리성우", "VOICE_ACTOR", "도시괴담 저음 입체음향"),
  creator("힐링성우", "VOICE_ACTOR", "따뜻한 힐링 목소리", 100, 100),
  creator("그림담당", "ILLUSTRATOR", "미스터리 네온 콘티"),
  creator("음향담당", "SOUND_DIRECTOR", "괴담 입체음향 믹싱"),
];
const match = (prompt: string) => rankMatchingCreators(candidates, resolveMatchingContext({ projectDescription: prompt }));

test("정확한 직군은 작품 매체보다 우선", () => assert.deepEqual(detectMatchingRoles("로맨스 웹소설에 맞는 성우 추천"), ["VOICE_ACTOR"]));
test("여러 역할을 동시에 해석", () => assert.deepEqual(new Set(detectMatchingRoles("성우랑 BGM 담당이 필요해")), new Set(["VOICE_ACTOR", "SOUND_DIRECTOR"])));
test("한국어 조사 뒤 제외", () => assert.deepEqual(detectMatchingExcludedRoles("성우는 빼고 그림 작가만"), ["VOICE_ACTOR"]));
test("그림 작가 제외는 글 작가를 제외하지 않음", () => assert.deepEqual(detectMatchingExcludedRoles("그림 작가는 제외"), ["ILLUSTRATOR"]));
test("최신 역할 수정", () => assert.deepEqual(detectMatchingRoles("전에 글 작가를 봤는데 지금은 사운드 디자이너"), ["SOUND_DIRECTOR"]));
test("인원은 1의 부분 문자열로 해석하지 않음", () => assert.equal(detectMatchingLimit("10명 추천"), 6));
test("네 명 조건", () => assert.equal(detectMatchingLimit("네 명만 추천"), 4));
test("직군만 맞아도 만점에 가까워지지 않음", () => assert.ok(match("성우만 추천").every(item => item.score < 60)));
test("인기보다 작품 적합성 우선", () => assert.equal(match("도시괴담 저음 성우 추천")[0].creator.userId, "미스터리성우"));
test("추천 근거는 실제 프로필에 있는 항목만", () => assert.equal(match("네온 성우 추천")[0].matchedKeywords.includes("네온"), false));
test("동일 키워드 반복으로 점수 부풀리기 방지", () => assert.deepEqual(match("괴담 저음 성우").map(item => item.score), match("괴담 괴담 괴담 저음 성우").map(item => item.score)));
test("점수 합산과 범위", () => { for (const item of match("괴담 저음 입체음향 성우")) { assert.equal(item.score, item.matchSignals.reduce((sum, signal) => sum + signal.points, 0)); assert.ok(item.score >= 0 && item.score <= 100); } });
test("역할을 바꿔도 앞선 작품 맥락 유지", () => {
  const context = resolveMatchingContext({ projectDescription: "이번엔 성우만", messages: [{ role: "user", content: "도시괴담 오디오드라마에 맞는 그림 작가" }] });
  assert.deepEqual(context.roles, ["VOICE_ACTOR"]); assert.ok(context.topics.includes("미스터리"));
  assert.equal(rankMatchingCreators(candidates, context)[0].creator.userId, "미스터리성우");
});
test("후속 질문에서 역할과 인원 기억", () => {
  const context = resolveMatchingContext({ projectDescription: "왜 추천했어?", messages: [{ role: "user", content: "미스터리 성우 한 명만" }, { role: "assistant", content: "그림 작가 세 명 추천" }] });
  assert.deepEqual(context.roles, ["VOICE_ACTOR"]); assert.equal(context.limit, 1);
});
test("제외 조건을 후속 질문에서도 유지", () => {
  const context = resolveMatchingContext({ projectDescription: "누가 더 나아?", messages: [{ role: "user", content: "성우는 빼고 그림 작가만" }] });
  assert.deepEqual(rankMatchingCreators(candidates, context).map(item => item.creator.primaryRole), ["ILLUSTRATOR"]);
});
test("여러 직군 팀 구성은 한 역할로 몰리지 않음", () => assert.deepEqual(new Set(match("괴담 성우와 BGM 담당 세 명").map(item => item.creator.primaryRole)), new Set(["VOICE_ACTOR", "SOUND_DIRECTOR"])));
test("후보 이름으로 제외해도 같은 직군 대안 유지", () => {
  const named = candidates.map(item => ({ ...item, displayName: item.userId === "미스터리성우" ? "하루" : item.displayName }));
  const results = rankMatchingCreators(named, resolveMatchingContext({ projectDescription: "하루님 말고 다른 성우" }));
  assert.equal(results.length, 1); assert.equal(results[0].creator.userId, "힐링성우");
});
test("없는 직군은 후보를 만들지 않음", () => assert.deepEqual(match("편집자만 추천"), []));
test("빈 프로필 목록", () => assert.deepEqual(rankMatchingCreators([], resolveMatchingContext({ projectDescription: "성우 추천" })), []));
test("새 프로젝트는 이전 조건 초기화", () => {
  const context = resolveMatchingContext({ projectDescription: "새 프로젝트는 힐링 그림 작가", messages: [{ role: "user", content: "미스터리 성우 한 명" }] });
  assert.deepEqual(context.roles, ["ILLUSTRATOR"]); assert.equal(context.topics.includes("미스터리"), false); assert.equal(context.limit, 3);
});
test("제외한 장르를 긍정 조건으로 점수화하지 않음", () => assert.equal(resolveMatchingContext({ projectDescription: "힐링은 말고 미스터리 성우" }).topics.includes("힐링"), false));
console.log(`Creator matching passed: ${passed} cases`);
