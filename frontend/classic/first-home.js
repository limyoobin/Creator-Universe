const creators = [
  { role: "WRITER", label: "글", name: "유리노", handle: "yurino_script", rate: 98,
    headline: "보이스 드라마와 여성향 세계관 설계에 강한 시나리오 작가",
    bio: "긴 호흡의 감정선과 캐릭터 중심 대사를 잘 다듬습니다.",
    skills: ["시나리오", "대사 각색", "세계관 설계"], projects: 18, followers: 3800, availability: "2주 내 합류 가능" },
  { role: "ILLUSTRATOR", label: "그림", name: "렌카", handle: "renka_frame", rate: 95,
    headline: "서브컬처 캐릭터 비주얼과 썸네일 아트 디렉션 전문",
    bio: "라이트노벨 커버와 오디오 드라마 키비주얼을 제작합니다.",
    skills: ["캐릭터 디자인", "표지", "썸네일"], projects: 24, followers: 8200, availability: "즉시 가능" },
  { role: "VOICE_ACTOR", label: "목소리", name: "하루카", handle: "haruka_voice", rate: 99,
    headline: "청량한 소녀 톤부터 몽환적인 내레이션까지 소화하는 성우",
    bio: "ASMR, 오디오북, 캐릭터 보이스 샘플을 빠르게 공유합니다.",
    skills: ["캐릭터 보이스", "나레이션", "ASMR"], projects: 31, followers: 12400, availability: "이번 주 녹음 슬롯 3개" },
];

const waveform = [20, 34, 28, 52, 47, 68, 36, 54, 42, 73, 50, 32, 61, 40];
function renderCreators(role) {
  const chosen = creators.filter(creator => role === "ALL" || creator.role === role);
  const grid = document.getElementById("creatorGrid");
  // Only the original, locally defined sample profiles are rendered here.
  grid.innerHTML = chosen.map(creator => `
    <article class="panel creator-card" data-accent="${creator.role}">
      <div class="creator-inner">
        <span class="creator-role">${creator.label}</span>
        <div class="creator-head">
          <div><div class="creator-name">${creator.name}</div><div class="creator-handle">@${creator.handle}</div></div>
          <div class="creator-rate"><small>Response</small><strong>${creator.rate}%</strong></div>
        </div>
        <div class="creator-tagline">${creator.headline}</div><div class="creator-desc">${creator.bio}</div>
        ${creator.role === "VOICE_ACTOR" ? `<div class="voice-player">
          <div class="voice-head"><span>Moonlit Monologue Demo</span><span>샘플 파형</span></div>
          <div class="voice-row"><span aria-hidden="true">♫</span><div class="waveform" aria-hidden="true">${waveform.map((h,i) => `<span class="${i < 8 ? "active" : ""}" style="height:${h}px"></span>`).join("")}</div></div>
        </div>` : ""}
        <div class="chip-row">${creator.skills.map(skill => `<span>${skill}</span>`).join("")}</div>
        <div class="creator-stats">
          <div><small>Projects</small><strong>${creator.projects}</strong></div>
          <div><small>Followers</small><strong>${creator.followers.toLocaleString("ko-KR")}</strong></div>
          <div><small>Available</small><strong>${creator.availability}</strong></div>
        </div>
      </div>
    </article>`).join("") || '<p class="empty-state">이 분야에는 등록된 샘플 포트폴리오가 없어요.</p>';
  document.querySelectorAll("[data-filter]").forEach(button => {
    const active = button.dataset.filter === role;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderSettlement() {
  const count = Number(document.getElementById("scenarioCount").value);
  const gross = count * 1000;
  const fee = Math.round(gross * 0.13);
  const net = gross - fee;
  const coins = amount => amount.toLocaleString("ko-KR") + " 코인";
  const labels = { heroGrossRevenue: coins(gross), heroTransactionCount: count + "건",
    grossAmountLabel: coins(gross), feeRateLabel: "플랫폼 수수료 13%", feeAmountLabel: "− " + coins(fee),
    netAmountLabel: coins(net), distributableAmountLabel: coins(net), mySettlementLabel: coins(net * 0.3) };
  for (const [id, label] of Object.entries(labels)) document.getElementById(id).textContent = label;
  document.getElementById("shareList").innerHTML = creators.map((creator, i) => {
    const share = [30, 30, 40][i];
    return `<div class="share-item" data-tone="${creator.role}">
      <div class="share-head"><div><small>Share Holder</small><strong>${creator.name} · ${creator.label}</strong></div><div class="share-percent">${share}%</div></div>
      <p>이번 주 예상 정산액 ${coins(net * share / 100)}</p></div>`;
  }).join("");
}

const lines = [
  "문이 열리는 순간, 오래된 별빛이 숨을 쉬기 시작했다.",
  "지금, 너의 이름을 부르는 목소리가 가장 또렷하게 번진다.",
  "한 걸음 더 다가오면, 잊고 있던 장면들이 파도처럼 깨어난다.",
  "멈추지 마. 이 밤의 마지막 페이지는 아직 재생 중이니까.",
];
const secondsPerCue = 5;
const duration = lines.length * secondsPerCue;
let seconds = 0;
let timer = null;
const play = document.querySelector(".big-play");
function stop() {
  window.clearInterval(timer);
  timer = null;
  play.setAttribute("aria-pressed", "false");
  play.setAttribute("aria-label", "대본 자동 넘김 시작");
  document.getElementById("cuePlayIcon").textContent = "▶";
}
function showCue() {
  const index = Math.min(lines.length - 1, Math.floor(seconds / secondsPerCue));
  document.getElementById("transcriptArea").innerHTML = lines.map((line,i) =>
    `<div class="lyric ${i === index ? "active" : i < index ? "past" : i === index + 1 ? "next" : "future"}"><span>${line}</span></div>`).join("");
  const percent = seconds * 100 / duration;
  document.querySelector(".progress-bar").setAttribute("aria-valuenow", String(percent));
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressHead").style.left = percent + "%";
  document.getElementById("currentTimeLabel").textContent = "00:" + String(seconds).padStart(2,"0");
}
document.getElementById("durationLabel").textContent = "00:" + duration;
play.addEventListener("click", () => {
  if (timer !== null) { stop(); return; }
  if (seconds >= duration) seconds = 0;
  showCue();
  play.setAttribute("aria-pressed", "true");
  play.setAttribute("aria-label", "대본 자동 넘김 일시 정지");
  document.getElementById("cuePlayIcon").textContent = "Ⅱ";
  timer = window.setInterval(() => { seconds++; showCue(); if (seconds >= duration) stop(); }, 1000);
});
document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
document.getElementById("scenarioCount").addEventListener("change", renderSettlement);
document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => renderCreators(button.dataset.filter)));
renderCreators("ALL");
renderSettlement();
showCue();

const themeToggle = document.getElementById("themeToggle");
function showTheme(dark) {
  document.body.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
}
try { showTheme(localStorage.getItem("creator-universe-theme") === "dark"); } catch { showTheme(false); }
themeToggle.addEventListener("click", () => {
  showTheme(document.body.dataset.theme !== "dark");
  try { localStorage.setItem("creator-universe-theme", document.body.dataset.theme); } catch { /* Session-only theme. */ }
});

const navLinks = [...document.querySelectorAll(".nav a, .mobile-tab")];
function markSection(hash) {
  for (const link of navLinks) {
    const current = link.hash === hash;
    link.classList.toggle("active", current);
    if (current) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
  }
}
window.addEventListener("hashchange", () => markSection(window.location.hash || "#home"));
markSection(window.location.hash || "#home");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }
  }, {threshold: 0.04});
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
  document.documentElement.classList.add("can-reveal");
}
