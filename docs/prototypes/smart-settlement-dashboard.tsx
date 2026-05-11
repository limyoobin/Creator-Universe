import React from "react";

type RevenueSlice = {
  label: string;
  share: number;
  color: string;
  stroke: string;
  amount: number;
};

const MONTHLY_TOTAL_COINS = 100000;
const PLATFORM_FEE_RATE = 0.15;
const MY_ROLE = "성우";
const MY_SHARE = 0.4;

const revenueSlices: RevenueSlice[] = [
  {
    label: "작가",
    share: 0.3,
    color: "from-rose-400/25 via-fuchsia-400/15 to-transparent",
    stroke: "#fb7185",
    amount: MONTHLY_TOTAL_COINS * 0.3,
  },
  {
    label: "일러스트",
    share: 0.3,
    color: "from-cyan-400/25 via-sky-400/15 to-transparent",
    stroke: "#38bdf8",
    amount: MONTHLY_TOTAL_COINS * 0.3,
  },
  {
    label: "성우",
    share: 0.4,
    color: "from-violet-400/25 via-indigo-400/15 to-transparent",
    stroke: "#a78bfa",
    amount: MONTHLY_TOTAL_COINS * 0.4,
  },
];

const totalFeeCoins = MONTHLY_TOTAL_COINS * PLATFORM_FEE_RATE;
const distributableCoins = MONTHLY_TOTAL_COINS - totalFeeCoins;
const mySettlementCoins = distributableCoins * MY_SHARE;

function formatCoins(value: number) {
  return `${value.toLocaleString("ko-KR")} 코인`;
}

function DonutChart({ slices }: { slices: RevenueSlice[] }) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="relative flex h-[280px] w-[280px] items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_rgba(167,139,250,0.18),_transparent_58%)] blur-2xl" />
      <svg viewBox="0 0 220 220" className="relative h-full w-full -rotate-90 drop-shadow-[0_0_24px_rgba(129,140,248,0.24)]">
        <defs>
          <linearGradient id="trackGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
        </defs>

        <circle cx="110" cy="110" r={radius} fill="none" stroke="url(#trackGlow)" strokeWidth="24" />

        {slices.map((slice) => {
          const dash = circumference * slice.share;
          const gap = circumference - dash;
          const offset = -circumference * accumulated;
          accumulated += slice.share;

          return (
            <circle
              key={slice.label}
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={slice.stroke}
              strokeWidth="24"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>

      <div className="absolute inset-[58px] rounded-full border border-white/10 bg-[#0d1018]/90 backdrop-blur-xl" />
      <div className="absolute text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">분배 가능 금액</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{formatCoins(distributableCoins)}</p>
        <p className="mt-2 text-sm text-white/45">수수료 차감 후 팀 정산 대상</p>
      </div>
    </div>
  );
}

export default function SmartSettlementDashboard() {
  return (
    <main className="min-h-screen bg-[#08090d] px-6 py-10 text-white md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(145deg,rgba(13,16,24,0.96),rgba(9,12,20,0.9))] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.16),_transparent_32%)]" />
          <div className="relative">
            <p className="text-sm uppercase tracking-[0.34em] text-cyan-200/65">Smart Settlement Dashboard</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              이번 달 총 결제 수익:
              <span className="mt-2 block bg-gradient-to-r from-fuchsia-200 via-violet-200 to-cyan-200 bg-clip-text text-transparent">
                100,000 코인
              </span>
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55 md:text-base">
              플랫폼 수수료를 먼저 차감한 뒤, 프로젝트 팀원 간 합의된 지분율에 따라 자동 정산되는 구조를
              한눈에 확인할 수 있습니다.
            </p>
          </div>

          <div className="relative mt-10 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="grid items-center gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="flex justify-center">
                  <DonutChart slices={revenueSlices} />
                </div>

                <div className="space-y-4">
                  {revenueSlices.map((slice) => (
                    <div
                      key={slice.label}
                      className={`rounded-3xl border border-white/10 bg-gradient-to-r ${slice.color} px-5 py-4`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Share Holder</p>
                          <p className="mt-2 text-xl font-semibold text-white">{slice.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-semibold text-white">{Math.round(slice.share * 100)}%</p>
                          <p className="mt-1 text-sm text-white/55">{formatCoins(slice.amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="rounded-[30px] border border-violet-300/15 bg-[linear-gradient(180deg,rgba(21,24,36,0.94),rgba(13,15,24,0.96))] p-6 shadow-[0_24px_80px_rgba(76,29,149,0.18)]">
              <p className="text-sm uppercase tracking-[0.3em] text-violet-200/65">My Settlement</p>
              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                <p className="text-sm text-white/50">로그인한 사용자 역할</p>
                <p className="mt-2 text-2xl font-semibold text-white">{MY_ROLE}</p>
                <p className="mt-1 text-sm text-white/45">팀 지분율 {Math.round(MY_SHARE * 100)}%</p>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-white/55">총 결제 수익</span>
                  <span className="text-sm font-medium text-white">{formatCoins(MONTHLY_TOTAL_COINS)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-rose-300/10 bg-rose-400/5 px-4 py-3">
                  <span className="text-sm text-white/55">플랫폼 수수료 15%</span>
                  <span className="text-sm font-medium text-rose-200">- {formatCoins(totalFeeCoins)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-cyan-300/10 bg-cyan-400/5 px-4 py-3">
                  <span className="text-sm text-white/55">팀 정산 대상 금액</span>
                  <span className="text-sm font-medium text-cyan-100">{formatCoins(distributableCoins)}</span>
                </div>
              </div>

              <div className="mt-6 rounded-[30px] border border-violet-300/20 bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.2),_transparent_65%),linear-gradient(180deg,rgba(139,92,246,0.14),rgba(17,24,39,0.18))] p-6">
                <p className="text-sm uppercase tracking-[0.28em] text-white/45">나의 실제 정산액</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{formatCoins(mySettlementCoins)}</p>
                <p className="mt-3 text-sm leading-6 text-white/58">
                  수수료 차감 후 정산 대상 금액에서 내 지분율 40%가 자동 적용된 이번 달 예상 정산액입니다.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
