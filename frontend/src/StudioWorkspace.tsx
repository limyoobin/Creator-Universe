import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, ChevronRight, Layers3, PenLine, Sparkles, UsersRound, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import "./studio-workspace.css";

const workspacePanels = [
  { id: "overview", label: "개요" },
  { id: "publishing", label: "작품 편집" },
  { id: "channel", label: "채널 · 팬" },
  { id: "team", label: "팀 · 프로필" },
] as const;
export type StudioPanel = typeof workspacePanels[number]["id"];

function panelFromLocation(): StudioPanel {
  const id = new URLSearchParams(window.location.search).get("panel");
  return workspacePanels.find(panel => panel.id === id)?.id ?? "overview";
}

export function useStudioPanel() {
  const [panel, setPanel] = useState<StudioPanel>(panelFromLocation);
  useEffect(() => {
    const sync = () => setPanel(panelFromLocation());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function selectPanel(next: StudioPanel, focus = false) {
    const url = new URL(window.location.href);
    url.searchParams.set("studio", "studio");
    if (next === "overview") url.searchParams.delete("panel");
    else url.searchParams.set("panel", next);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    setPanel(next);
    if (focus) requestAnimationFrame(() => document.getElementById("studio-panel-" + next)?.focus());
  }
  return { panel, selectPanel };
}

const guestTools = [
  { id: "studio", title: "작품 편집", detail: "작품과 회차를 쓰고 독자 화면을 미리 보세요.", icon: PenLine },
  { id: "matching", title: "AI 팀원 매칭", detail: "작품에 필요한 역할과 조건으로 팀원을 찾으세요.", icon: UsersRound },
  { id: "settlement", title: "팀 정산", detail: "팀 지분과 주 단위 정산 내역을 확인하세요.", icon: Wallet },
] as const;

export function StudioEntry({ destination, onLogin }: {
  destination: string;
  onLogin: (destination: "studio" | "matching" | "settlement", panel?: StudioPanel) => void;
}) {
  const selected = guestTools.find(item => item.id === destination) ?? guestTools[0];
  return <section className="sw-entry" aria-labelledby="sw-entry-title">
    <div className="sw-entry-hero">
      <div className="sw-entry-copy">
        <h1 id="sw-entry-title">창작자 <br />스튜디오<span aria-hidden="true">.</span></h1>
        <p>첫 콘티부터 다음 연재까지.<br />작품을 다듬고 함께할 팀을 만나는 작업실입니다.</p>
        <button className="sw-button primary" onClick={() => onLogin(selected.id)}>{selected.id === "studio" ? "로그인하고 시작하기" : selected.title + " 로그인"} <ArrowRight size={17} /></button>
      </div>
      <img className="sw-atelier" src="/studio/atelier.webp" width="1440" height="960" alt="석양이 드는 웹툰 작업실의 콘티와 드로잉 태블릿" fetchPriority="high" />
    </div>
    <div className="sw-guest-tools">
      {guestTools.map(({ id, title, detail, icon: Icon }) => <button key={id} onClick={() => onLogin(id, id === "studio" ? "publishing" : undefined)}>
        <Icon size={22} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span>
        <ArrowUpRight className="sw-card-arrow" size={18} aria-hidden="true" />
      </button>)}
    </div>
  </section>;
}

type WorkspaceProps = {
  name: string;
  panel: StudioPanel;
  selectPanel: (panel: StudioPanel, focus?: boolean) => void;
  workCount: number;
  proposalCount: number;
  profilePercent: number;
  savedTitle: string;
  onMatch: () => void;
  onProfile: () => void;
  onProposals: () => void;
};

export function StudioWorkspace({ name, panel, selectPanel, workCount, proposalCount, profilePercent, savedTitle, onMatch, onProfile, onProposals }: WorkspaceProps) {
  return <>
    <header className="sw-heading">
      <div><h1>내 스튜디오</h1><p>{name}님의 작업실</p></div>
      <button className="sw-button primary" onClick={onMatch}><Sparkles size={17} /> AI 매칭 매니저</button>
    </header>
    <nav className="sw-panel-nav" aria-label="작업실 둘러보기">
      {workspacePanels.map(item => <button key={item.id} aria-current={item.id === panel ? "page" : undefined}
        onClick={() => selectPanel(item.id)}>{item.label}</button>)}
    </nav>
    {panel === "overview" && <div id="studio-panel-overview" tabIndex={-1} className="sw-overview">
      <article className="sw-draft-tile">
        <div>
          <span className="sw-desk-label"><PenLine size={17} /> 작품 편집기</span>
          <h2>{savedTitle || "첫 작품을 써 볼까요?"}</h2>
          <p>{savedTitle ? "이 기기에 저장한 초안입니다. 마지막 원고부터 이어서 쓰세요." : "제목과 첫 장면을 적고, 독자에게 보일 회차를 미리 확인하세요."}</p>
          <button className="sw-button light" onClick={() => selectPanel("publishing", true)}>{savedTitle ? "초안 이어 쓰기" : "작품 초안 쓰기"} <ArrowRight size={16} /></button>
        </div>
      </article>
      <section className="sw-activity" aria-label="내 작업 현황">
        <h2>작업 현황</h2>
        <button onClick={() => selectPanel("channel", true)}><BookOpen /><span>참여 작품</span><strong>{workCount}편</strong><ChevronRight /></button>
        <button onClick={onProposals}><Layers3 /><span>대기 중인 제안</span><strong>{proposalCount}건</strong><ChevronRight /></button>
        <button onClick={onProfile}><CheckCircle2 /><span>프로필 완성도</span><strong>{profilePercent}%</strong><ChevronRight /></button>
      </section>
    </div>}
  </>;
}
