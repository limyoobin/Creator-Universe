import React from "react";

const transcriptLines = [
  { id: 1, text: "문이 열리는 순간, 오래된 별빛이 숨을 쉬기 시작했다.", state: "past" },
  { id: 2, text: "지금, 너의 이름을 부르는 목소리가 가장 또렷하게 번진다.", state: "active" },
  { id: 3, text: "한 걸음 더 다가오면, 잊고 있던 장면들이 파도처럼 깨어난다.", state: "next" },
  { id: 4, text: "멈추지 마. 이 밤의 마지막 페이지는 아직 재생 중이니까.", state: "future" },
];

const progress = 0.61;

function PlayPauseButton() {
  return (
    <button
      type="button"
      aria-label="재생 또는 일시정지"
      className="group relative flex h-28 w-28 items-center justify-center rounded-full border border-cyan-200/30 bg-white/10 text-white shadow-[0_0_60px_rgba(34,211,238,0.22)] backdrop-blur-xl transition duration-300 hover:scale-105 hover:border-cyan-100/50 hover:bg-white/15 md:h-32 md:w-32"
    >
      <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,_rgba(34,211,238,0.25),_rgba(168,85,247,0.18),_rgba(34,211,238,0.25))] opacity-80 blur-md transition group-hover:opacity-100" />
      <span className="relative flex items-center gap-1">
        <span className="h-8 w-2 rounded-full bg-white md:h-9" />
        <span className="h-8 w-2 rounded-full bg-white md:h-9" />
      </span>
    </button>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between text-sm text-white/70">
        <span>03:28</span>
        <span>05:42</span>
      </div>
      <div
        aria-label="오디오 진행률"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(value * 100)}
        role="progressbar"
        className="relative h-4 overflow-hidden rounded-full border border-white/10 bg-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)]"
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 shadow-[0_0_28px_rgba(103,232,249,0.4)]" style={{ width: `${value * 100}%` }} />
        <div className="absolute inset-y-[2px] w-8 rounded-full bg-white/80 blur-[2px]" style={{ left: `calc(${value * 100}% - 1rem)` }} />
      </div>
    </div>
  );
}

function TranscriptLine({
  text,
  state,
}: {
  text: string;
  state: "past" | "active" | "next" | "future";
}) {
  const styles =
    state === "active"
      ? "scale-100 text-white opacity-100"
      : state === "next"
        ? "scale-[0.98] text-cyan-100 opacity-80"
        : state === "past"
          ? "scale-[0.96] text-white/55 opacity-55"
          : "scale-[0.94] text-white/38 opacity-40";

  return (
    <p
      className={`transition-all duration-500 ${styles} text-center text-2xl font-semibold leading-[1.7] tracking-[0.01em] md:text-4xl`}
    >
      {state === "active" ? (
        <span className="bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_34%,#67e8f9_55%,#f5d0fe_100%)] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(255,255,255,0.3)]">
          {text}
        </span>
      ) : (
        text
      )}
    </p>
  );
}

export default function MultimediaViewer() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <section className="relative flex min-h-screen flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_24%),linear-gradient(180deg,#070910_0%,#05070d_100%)]" />

        <div className="relative h-[52vh] min-h-[380px] overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-20 grayscale" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,13,0.18),rgba(5,7,13,0.55)_52%,rgba(5,7,13,0.92)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_42%)]" />

          <div className="relative mx-auto flex h-full max-w-5xl items-center justify-center px-6">
            <div className="w-full max-w-4xl space-y-5">
              <p className="text-center text-sm uppercase tracking-[0.34em] text-cyan-100/75">
                Voice First Audio Viewer
              </p>
              <div className="space-y-4">
                {transcriptLines.map((line) => (
                  <TranscriptLine key={line.id} text={line.text} state={line.state as never} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col justify-center px-6 pb-8 pt-8 md:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center">
            <div className="rounded-[36px] border border-white/10 bg-white/[0.03] px-8 py-10 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:px-12">
              <div className="flex flex-col items-center">
                <div className="mb-5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-white/60">
                  Episode 03 • Midnight Signal
                </div>
                <h1 className="text-center text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  화면 중앙의 컨트롤 하나로
                  <span className="mt-2 block bg-gradient-to-r from-white via-cyan-100 to-fuchsia-100 bg-clip-text text-transparent">
                    듣기와 읽기를 동시에
                  </span>
                </h1>
                <p className="mt-5 max-w-2xl text-center text-sm leading-7 text-white/65 md:text-base">
                  저시력 사용자도 쉽게 따라올 수 있도록 큰 타이포, 높은 명도 대비, 또렷한 재생 상태 표현을
                  중심으로 구성한 멀티미디어 뷰어입니다.
                </p>

                <div className="mt-10">
                  <PlayPauseButton />
                </div>
              </div>
            </div>

            <div className="mt-10 w-full max-w-5xl">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.035] px-5 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-white/45">Now Playing</p>
                    <p className="mt-2 text-xl font-semibold text-white md:text-2xl">
                      너의 이름을 부르는 목소리
                    </p>
                  </div>
                  <div className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100">
                    고대비 모드 활성화
                  </div>
                </div>

                <ProgressBar value={progress} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
