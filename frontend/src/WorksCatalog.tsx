import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Eye, Grid2X2, List, Pause, Play, Search, Star, TrendingUp } from "lucide-react";
import "./works-catalog.css";
import { tideChapters, tideWork } from "./tide-letter";

type CatalogWork = {
  id: string;
  title: string;
  coverImage: string;
  format: string;
  genre: string;
  subGenre: string;
  tags: string[];
  tagline: string;
  episodes: number;
  rating: number;
  listeners: string;
};

export type CatalogMode = "works" | "ranking";

type CatalogProps<W extends CatalogWork> = {
  works: readonly W[];
  query: string;
  mode: CatalogMode;
  lastReadEpisode?: number;
  onModeChange: (mode: CatalogMode) => void;
  onClearSearch: () => void;
  onOpenWork: (work: W, mode?: "read" | "motion", episode?: number) => void;
  getRankScore: (work: W) => number;
  getCreatorNames: (work: W) => string[];
};

const features = [
  { id: tideWork.id, image: "/originals/tide-letter/feature.webp" },
  { id: "starlight-contract", image: "/banners/starlight-contract.webp" },
  { id: "dragon-archive", image: "/banners/dragon-archive.webp" },
  { id: "neon-pulse-zero", image: "/banners/neon-pulse-zero.webp" },
];

const shelves = [
  { label: "전체", formats: [] },
  { label: "소설", formats: ["소설", "웹소설"] },
  { label: "웹툰·만화", formats: ["웹툰", "만화"] },
  { label: "애니메이션", formats: ["애니메이션"] },
  { label: "오디오드라마", formats: ["오디오드라마"] },
  { label: "믹스미디어", formats: ["믹스미디어"] },
];

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko").replace(/\s+/g, "");
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.dataset.reducedMotion === "true");
  useEffect(() => {
    const system = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const setting = document.body.dataset.reducedMotion;
      setReduced(system.matches || setting === "true");
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-reduced-motion"] });
    system.addEventListener("change", update);
    update();
    return () => { observer.disconnect(); system.removeEventListener("change", update); };
  }, []);
  return reduced;
}

type FeaturedProps<W extends CatalogWork> = Pick<CatalogProps<W>, "works" | "onOpenWork" | "lastReadEpisode"> & {
  popularWork?: W;
  reducedMotion: boolean;
  onOpenRanking: () => void;
};

function FeaturedWorks<W extends CatalogWork>({ works, onOpenWork, onOpenRanking, popularWork, lastReadEpisode, reducedMotion }: FeaturedProps<W>) {
  const slides = features.flatMap((feature) => {
    const work = works.find((entry) => entry.id === feature.id);
    return work ? [{ work, image: feature.image, ranking: false }] : [];
  });
  if (popularWork) slides.push({ work: popularWork, image: popularWork.coverImage, ranking: true });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [visible, setVisible] = useState(true);
  const feature = useRef<HTMLElement>(null);
  const imageLayer = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;
  const selected = count ? index % count : 0;

  useEffect(() => {
    if (!feature.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(feature.current);
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    if (!visible || paused || interacting || hasFocus || reducedMotion || count < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % count);
    }, 7500);
    return () => window.clearInterval(timer);
  }, [visible, count, hasFocus, interacting, paused, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !imageLayer.current?.animate) return;
    const artTransition = imageLayer.current.animate([
      { opacity: .55, transform: "scale(1.027)" },
      { opacity: 1, transform: "scale(1)" },
    ], { duration: 680, easing: "cubic-bezier(.16,.7,.25,1)" });
    const textTransition = copy.current?.animate([
      { opacity: .45, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 420, easing: "ease-out" });
    return () => { artTransition.cancel(); textTransition?.cancel(); };
  }, [selected, reducedMotion]);

  if (!count) return null;
  const { work, image, ranking } = slides[selected];
  const original = work.id === tideWork.id && !ranking;
  const action = ranking ? "랭킹 보기" : !original ? "작품 보기" : lastReadEpisode ? `${lastReadEpisode}화 이어 읽기` : "웹툰 읽기";
  function move(amount: number) {
    setIndex((selected + amount + count) % count);
    setPaused(true);
  }
  function handleSwipe(event: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) move(dx < 0 ? 1 : -1);
  }

  return (
    <section ref={feature} className={"cu-feature" + (original ? " cu-feature-original" : "")} aria-label="추천 작품" aria-roledescription="캐러셀"
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocus={() => setHasFocus(true)} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const step = event.key === "ArrowLeft" ? -1 : 1;
        if ((event.target as HTMLElement).closest(".cu-feature-jumps")) {
          feature.current?.querySelectorAll<HTMLButtonElement>(".cu-feature-jumps button")[(selected + step + count) % count]?.focus({ preventScroll: true });
        }
        move(step);
      }}>
      <div className="cu-feature-stage"
        onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
        onTouchEnd={handleSwipe} onTouchCancel={() => { touchStart.current = null; }}>
        <div className={"cu-feature-image" + (ranking ? " cu-feature-ranking-art" : "")} ref={imageLayer}>
          <img key={image} src={image} alt="" fetchPriority="high" style={{ objectPosition: work.id === "neon-pulse-zero" ? "79% 42%" : "70% 37%" }} onError={(event) => {
            if (event.currentTarget.getAttribute("src") !== work.coverImage) event.currentTarget.src = work.coverImage;
          }} />
          {ranking && <img className="cu-feature-poster" src={image} alt="" />}
        </div>
        <div className="cu-feature-shade" />
        <div className="cu-feature-copy" ref={copy} aria-live={paused || reducedMotion ? "polite" : "off"} aria-atomic="true">
          <span className="cu-feature-meta"><b>{original ? "오리지널 웹툰" : ranking ? "인기 랭킹 1위" : work.format}</b>{work.genre}</span>
          <h2>{work.title}</h2>
          <p className="cu-feature-deck">{work.tagline}</p>
          <div className="cu-feature-actions">
            <button type="button" className="cu-feature-open" onClick={() => ranking ? onOpenRanking() : onOpenWork(work)}
              aria-label={ranking ? "인기 작품 랭킹 보기" : work.title + " " + action}>
              {action} <ArrowRight size={16} />
            </button>
            {original && <button type="button" className="cu-motion-open" onClick={() => onOpenWork(work, "motion")}><Play size={14} fill="currentColor"/>모션툰 보기</button>}
          </div>
        </div>
        {count > 1 && <div className="cu-feature-controls">
          <span className="cu-slide-count" aria-label={count + "개 중 " + (selected + 1) + "번째"}>
            <b>{String(selected + 1).padStart(2, "0")}</b><span>/</span>{String(count).padStart(2, "0")}
          </span>
          <button type="button" aria-label="이전 추천 작품" onClick={() => move(-1)}><ChevronLeft size={17} /></button>
          {!reducedMotion && <button type="button" aria-label={paused ? "슬라이드 자동 재생" : "슬라이드 일시 정지"}
            onClick={() => setPaused((value) => !value)}>{paused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}</button>}
          <button type="button" aria-label="다음 추천 작품" onClick={() => move(1)}><ChevronRight size={17} /></button>
        </div>}
      </div>
      {count > 1 && <div className="cu-feature-jumps" role="group" aria-label="추천 작품 선택">
        {slides.map((slide, n) => <button key={slide.ranking ? "ranking" : slide.work.id} type="button"
          aria-pressed={n === selected} aria-label={slide.ranking ? "인기 랭킹 슬라이드" : slide.work.title + " 슬라이드"}
          onClick={() => { setIndex(n); setPaused(true); }}>
          <img src={slide.work.coverImage} alt="" />
          <span><small>{slide.ranking ? "인기 랭킹" : slide.work.format}</small><strong>{slide.work.title}</strong></span>
        </button>)}
      </div>}
    </section>
  );
}

function RankList<W extends CatalogWork>({ works, onOpenWork, getCreatorNames }: Pick<CatalogProps<W>, "works" | "onOpenWork" | "getCreatorNames">) {
  return <ol className="cu-rank-list">{works.map((work, index) => (
    <li key={work.id}><button type="button" onClick={() => onOpenWork(work)}>
      <span className="cu-rank-number">{String(index + 1).padStart(2, "0")}</span>
      <img src={work.coverImage} alt="" className="cu-rank-cover" loading="lazy" />
      <span className="cu-rank-name"><strong>{work.title}</strong><small>{[work.format, getCreatorNames(work)[0]].filter(Boolean).join(" · ")}</small></span>
      <span className="cu-rank-audience" aria-label={"누적 감상 " + work.listeners + "회"}><Eye size={12} />{work.listeners}</span>
      <ChevronRight className="cu-rank-chevron" size={17} />
    </button></li>
  ))}</ol>;
}

export function WorksCatalog<W extends CatalogWork>(props: CatalogProps<W>) {
  const { works, query, mode, onModeChange, onClearSearch, onOpenWork, getRankScore, getCreatorNames } = props;
  const [shelf, setShelf] = useState(0);
  const [sort, setSort] = useState("featured");
  const [layout, setLayout] = useState<"grid" | "list">(() => {
    try { return localStorage.getItem("cu-reader-layout") === "list" ? "list" : "grid"; }
    catch { return "grid"; }
  });
  function changeLayout(value: "grid" | "list") {
    setLayout(value);
    try { localStorage.setItem("cu-reader-layout", value); } catch { /* Still works for this visit. */ }
  }
  const heading = useRef<HTMLHeadingElement>(null);
  const focusRanking = useRef(false);
  useEffect(() => {
    if (mode === "ranking" && focusRanking.current) {
      heading.current?.focus({ preventScroll: true });
      focusRanking.current = false;
    }
  }, [mode]);
  function openRanking() {
    setShelf(0);
    focusRanking.current = true;
    onModeChange("ranking");
  }
  const search = query.trim();
  const words = search.split(/\s+/).filter(Boolean).map(normalize);
  const formats = shelves[shelf].formats;
  const entries = works.filter((work) => {
    if (!search) return !formats.length || formats.includes(work.format) || (formats.includes("애니메이션") && work.tags.includes("모션툰"));
    const fields = [work.title, work.format, work.genre, work.subGenre, ...work.tags, ...getCreatorNames(work)].map(normalize);
    return words.every((word) => fields.some((field) => field.includes(word)));
  });
  const byRank = (left: W, right: W) => getRankScore(right) - getRankScore(left);
  const ranked = [...works].sort(byRank);
  const original = works.find(work => work.id === tideWork.id);
  const rankedView = mode === "ranking";
  if (rankedView || sort === "popular") entries.sort(byRank);
  else if (sort === "rating") entries.sort((a, b) => b.rating - a.rating || byRank(a, b));
  else entries.sort((left, right) => Number(right.id === tideWork.id) - Number(left.id === tideWork.id));

  const browseHeading = search ? "검색 결과" : rankedView ? "작품 랭킹" : "작품 둘러보기";
  const showPicks = !search && !rankedView;
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const root = gridRef.current;
    if (!root || reducedMotion || !("IntersectionObserver" in window) || !root.animate) return;
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver((records) => {
      let delay = 0;
      for (const record of records) {
        if (!record.isIntersecting) continue;
        observer.unobserve(record.target);
        const animation = record.target.animate([
          { opacity: .5, transform: "translateY(9px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 330, delay: Math.min(delay, 90), easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
        delay += 25;
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: .08 });
    for (const tile of root.children) observer.observe(tile);
    return () => {
      observer.disconnect();
      for (const animation of animations) animation.cancel();
    };
  }, [reducedMotion, query, shelf, sort, layout, mode, works]);

  return <div className={"cu-catalog" + (rankedView ? " cu-catalog-ranking" : "")}>
    {showPicks &&
      <FeaturedWorks works={works} onOpenWork={onOpenWork} popularWork={ranked[0]} onOpenRanking={openRanking} lastReadEpisode={props.lastReadEpisode} reducedMotion={reducedMotion} />}
    <div className={"cu-browse-layout" + (showPicks ? " cu-with-aside" : "")}>
      <section className="cu-shelf" aria-labelledby="cu-catalog-heading">
        <div className="cu-shelf-title">
          <div><h1 id="cu-catalog-heading" ref={heading} tabIndex={-1}>{browseHeading}</h1>
            <p aria-live="polite" aria-atomic="true">{search ? "“" + search + "” · " + entries.length + "개 작품" : rankedView ? "감상 수, 평점, 회차 수를 반영한 샘플 순위" : (shelf ? shelves[shelf].label + " " : "전체 ") + entries.length + "작품"}</p>
          </div>
          {!rankedView && <div className="cu-display-options">
            <label className="cu-sort"><span className="cu-visually-hidden">작품 정렬</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">추천순</option><option value="popular">인기순</option><option value="rating">평점순</option>
              </select>
            </label>
            <div className="cu-layout-switch" role="group" aria-label="작품 표시 방식">
              <button type="button" aria-label="표지로 보기" title="표지로 보기" aria-pressed={layout === "grid"} onClick={() => changeLayout("grid")}><Grid2X2 size={16} /></button>
              <button type="button" aria-label="목록으로 보기" title="목록으로 보기" aria-pressed={layout === "list"} onClick={() => changeLayout("list")}><List size={18} /></button>
            </div>
          </div>}
        </div>
        {!search && <div className="cu-shelf-filters" role="group" aria-label={rankedView ? "랭킹 분야" : "작품 분야"}>
          {shelves.map((item, index) => <button key={item.label} type="button" aria-pressed={shelf === index}
            onClick={() => setShelf(index)}>{item.label}</button>)}
        </div>}
        {entries.length === 0 ? <div className="cu-no-results">
          <Search size={28} /><strong>{search ? "검색한 작품을 찾을 수 없어요" : "이 분야에 등록된 작품이 없어요"}</strong>
          {search && <p>다른 작품명이나 참여 작가명으로 검색해 보세요.</p>}
          <button type="button" onClick={() => { setShelf(0); onClearSearch(); }}>전체 작품 보기 <ArrowRight size={15} /></button>
        </div> : rankedView ?
          <div className="cu-ranking-full"><RankList works={entries} getCreatorNames={getCreatorNames} onOpenWork={onOpenWork} /></div> :
          <div ref={gridRef} className={"cu-works-grid" + (layout === "list" ? " cu-works-list" : "")}>{entries.map((work) => (
            <button className="cu-work-tile" type="button" key={work.id} onClick={() => onOpenWork(work)}>
              <span className="cu-tile-image">
                <img src={work.coverImage} loading="lazy" alt="" />
                <span className="cu-tile-format">{work.format}</span>
              </span>
              <span className="cu-tile-info">
                <strong>{work.title}</strong>
                <span className="cu-tile-byline">{getCreatorNames(work).join(" · ") || work.genre}</span>
                {layout === "list" && <span className="cu-tile-excerpt">{work.tagline}</span>}
                <span className="cu-tile-stats">{work.id === tideWork.id ? <><BookOpen size={13} /> 전편 무료 <i/> 3화 완결</> : <><Star size={12} fill="currentColor"/> {work.rating.toFixed(1)} <i/> {work.episodes}화</>}</span>
              </span>
              {layout === "list" && <ChevronRight className="cu-tile-chevron" size={18} />}
            </button>
          ))}</div>}
      </section>
      {showPicks && <aside className="cu-discovery-aside" aria-label="인기 순위와 무료 회차">
        <section className="cu-rank-preview" aria-labelledby="cu-rank-preview-title">
          <div className="cu-aside-head"><div><h2 id="cu-rank-preview-title">인기 랭킹 <TrendingUp aria-hidden="true" size={18}/></h2>
            <p>샘플 집계</p></div>
            <button type="button" onClick={openRanking} aria-label="인기 랭킹 전체 보기"><ArrowRight size={17} /></button>
          </div>
          <RankList works={ranked.slice(0, 4)} onOpenWork={onOpenWork} getCreatorNames={getCreatorNames} />
        </section>
        {original && <section className="cu-episode-shelf" aria-label={original.title + " 무료 공개 회차"}>
          <div className="cu-aside-head"><div><h2>무료 공개 회차</h2><p>{original.title} · 3화 완결</p></div><BookOpen aria-hidden="true" size={19}/></div>
          <div className="cu-episode-links">{tideChapters.map((chapter, index) => <button type="button" key={chapter.title}
            aria-label={original.title + " " + (index + 1) + "화 " + chapter.title + " 읽기"} onClick={() => onOpenWork(original, "read", index + 1)}>
            <img src={chapter.panels[index === 2 ? 0 : 1].art} alt="" loading="lazy" />
            <span><small>{index + 1}화{props.lastReadEpisode === index + 1 && " · 최근 읽은 회차"}</small><strong>{chapter.title}</strong></span><ChevronRight size={16}/>
          </button>)}</div>
        </section>}
      </aside>}
    </div>
  </div>;
}
