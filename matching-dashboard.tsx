import React, { useMemo, useState } from "react";

type CreatorCategory = "ALL" | "WRITER" | "ILLUSTRATOR" | "VOICE" | "BGM";

type Creator = {
  id: number;
  name: string;
  handle: string;
  category: Exclude<CreatorCategory, "ALL">;
  tagline: string;
  description: string;
  skills: string[];
  availability: string;
  accent: string;
  stats: {
    projects: number;
    followers: string;
    responseRate: string;
  };
  audioTrack?: {
    title: string;
    duration: string;
    progress: number;
    waveform: number[];
  };
};

const FILTERS: { label: string; value: CreatorCategory }[] = [
  { label: "전체", value: "ALL" },
  { label: "글", value: "WRITER" },
  { label: "그림", value: "ILLUSTRATOR" },
  { label: "목소리", value: "VOICE" },
  { label: "BGM", value: "BGM" },
];

const CREATORS: Creator[] = [
  {
    id: 1,
    name: "유리노",
    handle: "@yurino_script",
    category: "WRITER",
    tagline: "보이스 드라마와 여성향 세계관 설계에 강한 시나리오 작가",
    description:
      "긴 호흡의 감정선과 캐릭터 중심 대사를 잘 다듬습니다. 시즌형 오디오 연재 기획 경험이 많아요.",
    skills: ["시나리오", "대사 각색", "세계관 설계"],
    availability: "2주 내 합류 가능",
    accent: "from-rose-500/20 via-fuchsia-500/10 to-transparent",
    stats: { projects: 18, followers: "3.8k", responseRate: "98%" },
  },
  {
    id: 2,
    name: "렌카",
    handle: "@renka_frame",
    category: "ILLUSTRATOR",
    tagline: "서브컬처 캐릭터 비주얼과 썸네일 아트 디렉션 전문",
    description:
      "라이트노벨 커버, 오디오 드라마 키비주얼, 굿즈용 일러스트까지 일관된 톤으로 제작합니다.",
    skills: ["캐릭터 디자인", "표지", "썸네일"],
    availability: "즉시 가능",
    accent: "from-cyan-400/20 via-sky-500/10 to-transparent",
    stats: { projects: 24, followers: "8.2k", responseRate: "95%" },
  },
  {
    id: 3,
    name: "하루카",
    handle: "@haruka_voice",
    category: "VOICE",
    tagline: "청량한 소녀 톤부터 몽환적인 내레이션까지 소화하는 성우",
    description:
      "ASMR, 오디오북, 캐릭터 보이스 샘플을 빠르게 공유할 수 있고, 디렉션 반영 속도가 빠릅니다.",
    skills: ["캐릭터 보이스", "나레이션", "ASMR"],
    availability: "이번 주 녹음 슬롯 3개",
    accent: "from-violet-400/25 via-indigo-500/10 to-transparent",
    stats: { projects: 31, followers: "12.4k", responseRate: "99%" },
    audioTrack: {
      title: "Moonlit Monologue Demo",
      duration: "01:42",
      progress: 38,
      waveform: [20, 34, 28, 52, 47, 68, 36, 54, 42, 73, 50, 32, 61, 40, 56, 31, 45, 67, 38, 26],
    },
  },
  {
    id: 4,
    name: "오르페오",
    handle: "@orfeo_bgm",
    category: "BGM",
    tagline: "판타지 로맨스와 미스터리 장르에 어울리는 시네마틱 BGM 메이커",
    description:
      "짧은 루프부터 메인 테마까지 작업하며, 장면 전환과 감정 고조를 고려한 구조를 설계합니다.",
    skills: ["BGM 작곡", "믹싱", "루프 편집"],
    availability: "다음 달 정규 계약 가능",
    accent: "from-amber-400/20 via-orange-500/10 to-transparent",
    stats: { projects: 16, followers: "2.1k", responseRate: "93%" },
  },
  {
    id: 5,
    name: "세이란",
    handle: "@seiran_script",
    category: "WRITER",
    tagline: "하이틴 판타지와 사건 중심 전개에 특화된 연재 작가",
    description:
      "클리프행어 설계와 회차 단위 몰입감 유지에 강점이 있어 유료 연재 구조와도 잘 맞습니다.",
    skills: ["연재 구성", "플롯 설계", "감정선 관리"],
    availability: "프리프로덕션 협의 가능",
    accent: "from-emerald-400/20 via-teal-500/10 to-transparent",
    stats: { projects: 12, followers: "5.7k", responseRate: "97%" },
  },
  {
    id: 6,
    name: "노아",
    handle: "@noa_canvas",
    category: "ILLUSTRATOR",
    tagline: "세련된 남성향 캐릭터와 SF 소품 디테일이 강한 아티스트",
    description:
      "프로모션 배너부터 인게임 일러스트까지 밀도 있게 제작하며, 음성 프로젝트용 비주얼 브랜딩 경험이 있습니다.",
    skills: ["SF 디자인", "프로모션 아트", "브랜딩"],
    availability: "3일 내 견적 회신",
    accent: "from-blue-400/20 via-indigo-500/10 to-transparent",
    stats: { projects: 21, followers: "6.3k", responseRate: "96%" },
  },
];

const categoryLabel: Record<Exclude<CreatorCategory, "ALL">, string> = {
  WRITER: "글",
  ILLUSTRATOR: "그림",
  VOICE: "목소리",
  BGM: "BGM",
};

function VoiceWaveform({ waveform, progress }: { waveform: number[]; progress: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.18),_transparent_55%)]" />
      <div className="relative flex items-center gap-3">
        <button
          type="button"
          aria-label="오디오 재생"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-400/20 text-white shadow-[0_0_30px_rgba(139,92,246,0.22)] transition hover:scale-105 hover:bg-violet-300/30"
        >
          <span className="ml-0.5 text-sm">▶</span>
        </button>

        <div className="flex min-w-0 flex-1 items-end gap-1.5">
          {waveform.map((value, index) => {
            const active = ((index + 1) / waveform.length) * 100 <= progress;
            return (
              <span
                key={`${value}-${index}`}
                className={`w-2 rounded-full transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-t from-cyan-300 via-violet-300 to-fuchsia-200 shadow-[0_0_14px_rgba(125,211,252,0.45)]"
                    : "bg-white/15"
                }`}
                style={{ height: `${value}px` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  const isVoice = creator.category === "VOICE" && creator.audioTrack;

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#13131a]/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-white/15 hover:shadow-[0_30px_90px_rgba(76,29,149,0.28)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${creator.accent}`} />
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-[0.28em] text-white/65 uppercase">
              {categoryLabel[creator.category]}
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">{creator.name}</h3>
            <p className="mt-1 text-sm text-white/45">{creator.handle}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">Response</div>
            <div className="mt-1 text-sm font-medium text-white">{creator.stats.responseRate}</div>
          </div>
        </div>

        <div>
          <p className="text-base font-medium leading-7 text-white/92">{creator.tagline}</p>
          <p className="mt-3 text-sm leading-6 text-white/58">{creator.description}</p>
        </div>

        {isVoice ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>{creator.audioTrack.title}</span>
              <span>{creator.audioTrack.duration}</span>
            </div>
            <VoiceWaveform waveform={creator.audioTrack.waveform} progress={creator.audioTrack.progress} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {creator.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-white/70"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Projects</div>
            <div className="mt-1 text-lg font-semibold text-white">{creator.stats.projects}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Followers</div>
            <div className="mt-1 text-lg font-semibold text-white">{creator.stats.followers}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Available</div>
            <div className="mt-1 text-sm font-medium leading-5 text-white/78">{creator.availability}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MatchingDashboard() {
  const [activeFilter, setActiveFilter] = useState<CreatorCategory>("ALL");

  const filteredCreators = useMemo(() => {
    if (activeFilter === "ALL") {
      return CREATORS;
    }
    return CREATORS.filter((creator) => creator.category === activeFilter);
  }, [activeFilter]);

  return (
    <main className="min-h-screen bg-[#09090d] px-6 py-10 text-white md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(17,24,39,0.92),rgba(11,15,25,0.88))] px-6 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.10),_transparent_32%)]" />
          <div className="relative flex flex-col gap-8">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.32em] text-cyan-200/70">Creator Universe Matching</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                작품의 분위기에 맞는 팀원을
                <span className="block bg-gradient-to-r from-fuchsia-200 via-violet-200 to-cyan-200 bg-clip-text text-transparent">
                  오디오 중심 포트폴리오로 찾는 공간
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                글, 그림, 목소리, BGM 크리에이터를 한 화면에서 탐색하고 바로 팀을 구성할 수 있는
                서브컬처 스튜디오형 매칭 대시보드입니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {FILTERS.map((filter) => {
                const active = filter.value === activeFilter;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-full border px-5 py-3 text-sm font-medium transition ${
                      active
                        ? "border-violet-200/40 bg-gradient-to-r from-fuchsia-400/25 to-cyan-300/20 text-white shadow-[0_0_30px_rgba(147,51,234,0.24)]"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCreators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </section>
      </div>
    </main>
  );
}
