import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Clapperboard, Link2, Pause, Play, RotateCcw, X } from "lucide-react";
import { tideChapters, tideWork } from "./tide-letter";
import "./tide-reader.css";

export type TideMode = "read" | "motion";
const frames = tideChapters.flatMap((chapter, chapterIndex) => chapter.panels.map(panel => ({
  panel, episode: chapterIndex + 1, title: chapter.title,
})));
const secondsPerFrame = 7;

function MotionToon({ initialEpisode }: { initialEpisode: number }) {
  const [frame, setFrame] = useState(() => frames.findIndex(item => item.episode === initialEpisode));
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const shot = frames[frame];
  function seek(value: number) {
    setFrame(value);
    elapsedRef.current = 0;
    setElapsed(0);
    setEnded(false);
  }
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - previous) / 1000;
      previous = now;
      if (document.hidden) return;
      elapsedRef.current += delta;
      if (elapsedRef.current >= secondsPerFrame) {
        if (frame === frames.length - 1) {
          setPlaying(false); setEnded(true); setElapsed(secondsPerFrame);
        } else seek(frame + 1);
      } else setElapsed(elapsedRef.current);
    }, 150);
    return () => window.clearInterval(id);
  }, [frame, playing]);
  function toggle() {
    if (ended) seek(0);
    setPlaying(value => !value);
  }
  const seconds = Math.min(frames.length * secondsPerFrame, frame * secondsPerFrame + Math.floor(elapsed));
  const time = (s: number) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  return <div className="tide-film">
    <div className="tide-film-frame" key={frame} data-playing={playing} data-cut={frame % 2} data-night={shot.episode < 3}>
      <img src={shot.panel.art} alt={shot.panel.alt} style={{animationPlayState: playing ? "running" : "paused"}} />
      <span className="tide-shimmer" aria-hidden="true" />
      <span className="tide-film-stamp">{shot.episode}화 · {shot.title}</span>
    </div>
    <div className="tide-subtitles">
      {shot.panel.lines.length ? shot.panel.lines.map((line, i) => <p key={i}><b>{line.speaker}</b>{line.line}</p>) : <p>{shot.panel.caption}</p>}
    </div>
    <div className="tide-film-controls">
      <button type="button" onClick={toggle}>{playing ? <Pause/> : ended ? <RotateCcw/> : <Play/>}{playing ? "일시 정지" : ended ? "다시 재생" : "재생"}</button>
      <input type="range" aria-label="모션툰 장면 선택" aria-valuetext={(frame + 1) + "번째 장면"} min={0} max={frames.length - 1} value={frame} onChange={e => seek(Number(e.currentTarget.value))}/>
      <time>{time(seconds)} / {time(frames.length * secondsPerFrame)}</time>
    </div>
  </div>;
}

type Props = {
  initialEpisode: number;
  initialReadOffset: number;
  mode: TideMode;
  onMode: (m: TideMode) => void;
  onClose: () => void;
  onRead: (episode: number, offset: number) => void;
};
export function TideReader({ initialEpisode, initialReadOffset, mode, onMode, onClose, onRead }: Props) {
  const [episode, setEpisode] = useState(Math.max(1, Math.min(tideChapters.length, initialEpisode || 1)));
  const chapter = tideChapters[episode - 1];
  const scroller = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLProgressElement>(null);
  const bookmark = useRef({ episode, offset: initialReadOffset });
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "manual">("idle");
  const shareRequest = useRef(0);
  const chapterLink = new URL("/", window.location.origin);
  chapterLink.searchParams.set("work", tideWork.id);
  chapterLink.searchParams.set("episode", String(episode));
  const readCallback = useRef(onRead);
  readCallback.current = onRead;
  useLayoutEffect(() => {
    shareRequest.current++;
    setShareStatus("idle");
    const reader = scroller.current;
    if (!reader) return;
    if (mode !== "read") { reader.scrollTop = 0; return; }
    const offset = bookmark.current.episode === episode ? bookmark.current.offset : 0;
    const extent = () => Math.max(0, reader.scrollHeight - reader.clientHeight);
    reader.scrollTop = extent() * offset / 100;
    bookmark.current = { episode, offset };
    if (progress.current) progress.current.value = offset;
    readCallback.current(episode, offset);

    let frame = 0;
    let saveTimer = 0;
    let pendingOffset: number | undefined;
    function savePosition() {
      if (pendingOffset !== undefined) readCallback.current(episode, pendingOffset);
      pendingOffset = undefined;
    }
    function record() {
      frame = 0;
      const range = extent();
      if (!range || !reader) return;
      const percent = Math.min(100, Math.max(0, Math.round(reader.scrollTop / range * 100)));
      if (progress.current) progress.current.value = percent;
      if (percent === bookmark.current.offset) return;
      bookmark.current = { episode, offset: percent };
      pendingOffset = percent;
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(savePosition, 200);
    }
    function onScroll() { if (!frame) frame = requestAnimationFrame(record); }
    reader.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      reader.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(saveTimer);
      savePosition();
    };
  }, [episode, mode]);
  async function copyChapterLink() {
    const request = ++shareRequest.current;
    setShareStatus("manual");
    try {
      await navigator.clipboard.writeText(chapterLink.href);
      if (request === shareRequest.current) setShareStatus("copied");
    } catch {
      // The selectable link stays available when the browser blocks clipboard access.
    }
  }
  return <div className="modal-backdrop work-detail-backdrop tide-backdrop" role="dialog" aria-modal="true" aria-labelledby="tide-title">
    <div className="tide-reader" ref={scroller}>
      <header className="tide-reader-bar">
        <div><span className="tide-imprint">크리에이터 유니버스 오리지널</span><h2 id="tide-title">{tideWork.title}</h2></div>
        {mode === "read" && <select className="tide-episode-picker" aria-label="회차 선택" value={episode} onChange={e => setEpisode(Number(e.currentTarget.value))}>{tideChapters.map((c, i) => <option value={i+1} key={c.title}>{i+1}화 · {c.title}</option>)}</select>}
        <button type="button" className="tide-close" onClick={onClose} aria-label="작품 닫기"><X size={21}/></button>
        {mode === "read" && <progress ref={progress} max={100} className="tide-reading-progress" aria-label="현재 회차 읽은 위치" />}
      </header>
      <div className="tide-reading-tools">
        <div className="tide-modes" role="group" aria-label="감상 방식">
          <button type="button" aria-pressed={mode === "read"} onClick={() => onMode("read")}><BookOpen/>웹툰</button>
          <button type="button" aria-pressed={mode === "motion"} onClick={() => onMode("motion")}><Clapperboard/>모션툰</button>
        </div>
        {mode === "read" && <button type="button" className="tide-share" onClick={copyChapterLink}><Link2 size={16} /><span aria-live="polite">{shareStatus === "copied" ? "링크 복사됨" : "회차 링크 복사"}</span></button>}
        {mode === "read" && shareStatus === "manual" && <input className="tide-copy-url" aria-label="복사할 회차 주소" readOnly value={chapterLink.href} onFocus={e => e.currentTarget.select()} />}
      </div>
      {mode === "motion" ? <MotionToon initialEpisode={episode}/> : <>
        <header className="tide-chapter">
          <small>제 {episode} 화</small><h3>{chapter.title}</h3><p>{chapter.lead}</p>
        </header>
        <div className="tide-strip">{chapter.panels.map((panel, i) => <figure className="tide-panel" key={panel.art}>
          <img src={panel.art} alt={panel.alt} width={panel.width} height={panel.height} loading={i ? "lazy" : "eager"}/>
          <figcaption>
            {panel.caption && <p className="tide-narration">{panel.caption}</p>}
            {panel.lines.map((line, j) => <div key={j} className={"tide-speech " + (line.speaker === "해온" ? "tide-haeon" : "")}>
              <b>{line.speaker}</b><p>{line.line}</p>
            </div>)}
          </figcaption>
        </figure>)}</div>
        <footer className="tide-chapter-end">
          <p>{episode === 3 ? "밀물에 답장을 · 완결" : "제 " + episode + " 화 끝"}</p>
          {episode === 3 && <p className="tide-credit">크리에이터 유니버스를 위해 쓴 오리지널 단편 · AI 생성 작화</p>}
          <div>{episode > 1 && <button type="button" onClick={() => setEpisode(episode-1)}><ChevronLeft/>이전화</button>}
            {episode < 3 ? <button type="button" onClick={() => setEpisode(episode+1)}>다음화 · {tideChapters[episode].title}<ChevronRight/></button> :
              <button type="button" onClick={() => { setEpisode(1); onMode("motion"); }}><Clapperboard/>모션툰으로 감상</button>}</div>
        </footer>
      </>}
    </div>
  </div>;
}
