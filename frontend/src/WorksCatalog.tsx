import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Search, Star, TrendingUp } from "lucide-react";
import "./works-catalog.css";

type CatalogWork = {
  id: string;
  title: string;
  coverImage: string;
  format: string;
  genre: string;
  subGenre: string;
  tags: string[];
  episodes: number;
  rating: number;
  listeners: string;
};

export type CatalogMode = "works" | "ranking";

type CatalogProps<W extends CatalogWork> = {
  works: readonly W[];
  query: string;
  mode: CatalogMode;
  onModeChange: (mode: CatalogMode) => void;
  onClearSearch: () => void;
  onOpenWork: (work: W) => void;
  getRankScore: (work: W) => number;
  getCreatorNames: (work: W) => string[];
};

const features = [
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
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const system = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const setting = document.body.dataset.reducedMotion;
      setReduced(setting === undefined ? system.matches : setting === "true");
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-reduced-motion"] });
    system.addEventListener("change", update);
    update();
    return () => { observer.disconnect(); system.removeEventListener("change", update); };
  }, []);
  return reduced;
}

type FeaturedProps<W extends CatalogWork> = Pick<CatalogProps<W>, "works" | "onOpenWork"> & {
  popularWork?: W;
  onOpenRanking: () => void;
};

function FeaturedWorks<W extends CatalogWork>({ works, onOpenWork, onOpenRanking, popularWork }: FeaturedProps<W>) {
  const slides = features.flatMap((feature) => {
    const work = works.find((entry) => entry.id === feature.id);
    return work ? [{ work, image: feature.image, ranking: false }] : [];
  });
  if (popularWork) slides.push({ work: popularWork, image: popularWork.coverImage, ranking: true });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const reducedMotion = useReducedMotion();
  const count = slides.length;

  useEffect(() => {
    if (paused || interacting || hasFocus || reducedMotion || count < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % count);
    }, 7500);
    return () => window.clearInterval(timer);
  }, [count, hasFocus, interacting, paused, reducedMotion]);

  if (!count) return null;
  const selected = index % count;
  const { work, image, ranking } = slides[selected];
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
    <section className="cu-feature" aria-label="추천 작품" aria-roledescription="캐러셀"
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocus={() => setHasFocus(true)} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
      onTouchEnd={handleSwipe} onTouchCancel={() => { touchStart.current = null; }}>
      <div className={"cu-feature-image" + (ranking ? " cu-feature-ranking-art" : "")} key={work.id + selected}>
        <img src={image} alt="" fetchPriority="high" style={{ objectPosition: work.id === "neon-pulse-zero" ? "84% 45%" : "76% 46%" }} onError={(event) => {
          if (event.currentTarget.getAttribute("src") !== work.coverImage) event.currentTarget.src = work.coverImage;
        }} />
        {ranking && <img className="cu-feature-poster" src={image} alt="" />}
      </div>
      <div className="cu-feature-shade" />
      <div className="cu-feature-copy" aria-live={paused || reducedMotion ? "polite" : "off"} aria-atomic="true">
        <span className="cu-feature-meta">{ranking ? "인기 랭킹 1위" : work.format}<i />{work.genre}</span>
        <h2>{work.title}</h2>
        <button type="button" className="cu-feature-open" onClick={() => ranking ? onOpenRanking() : onOpenWork(work)}
          aria-label={ranking ? "인기 작품 랭킹 보기" : work.title + " 작품 보기"}>
          {ranking ? "랭킹 보기" : "작품 보기"} <ArrowRight size={16} />
        </button>
      </div>
      {count > 1 && <div className="cu-feature-controls">
        <span className="cu-slide-count" aria-label={count + "개 중 " + (selected + 1) + "번째"}>
          <b>{String(selected + 1).padStart(2, "0")}</b><span>/</span>{String(count).padStart(2, "0")}
        </span>
        <button type="button" aria-label="이전 추천 작품" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
        {!reducedMotion && <button type="button" aria-label={paused ? "슬라이드 자동 재생" : "슬라이드 일시 정지"}
          onClick={() => setPaused((value) => !value)}>{paused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}</button>}
        <button type="button" aria-label="다음 추천 작품" onClick={() => move(1)}><ChevronRight size={18} /></button>
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
      <span className="cu-rank-audience" aria-label={"누적 감상 " + work.listeners + "회"}>{work.listeners}</span>
      <ChevronRight className="cu-rank-chevron" size={17} />
    </button></li>
  ))}</ol>;
}

export function WorksCatalog<W extends CatalogWork>(props: CatalogProps<W>) {
  const { works, query, mode, onModeChange, onClearSearch, onOpenWork, getRankScore, getCreatorNames } = props;
  const [shelf, setShelf] = useState(0);
  const [sort, setSort] = useState("featured");
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
    if (!search) return !formats.length || formats.includes(work.format);
    const fields = [work.title, work.format, work.genre, work.subGenre, ...work.tags, ...getCreatorNames(work)].map(normalize);
    return words.every((word) => fields.some((field) => field.includes(word)));
  });
  const byRank = (left: W, right: W) => getRankScore(right) - getRankScore(left);
  const ranked = [...works].sort(byRank);
  const rankedView = mode === "ranking";
  if (rankedView || sort === "popular") entries.sort(byRank);
  else if (sort === "rating") entries.sort((a, b) => b.rating - a.rating || byRank(a, b));

  const browseHeading = search ? "검색 결과" : rankedView ? "작품 랭킹" : "작품 둘러보기";
  return <div className={"cu-catalog" + (rankedView ? " cu-catalog-ranking" : "")}>
    {!search && !rankedView && <div className="cu-feature-row">
      <FeaturedWorks works={works} onOpenWork={onOpenWork} popularWork={ranked[0]} onOpenRanking={openRanking} />
      <aside className="cu-rank-preview" aria-labelledby="cu-rank-preview-title">
        <div className="cu-rank-head"><h2 id="cu-rank-preview-title"><TrendingUp size={21} />인기 랭킹 <small>샘플 집계</small></h2>
          <button type="button" onClick={openRanking} aria-label="인기 랭킹 전체 보기"><ChevronRight size={20} /></button>
        </div>
        <RankList works={ranked.slice(0, 4)} onOpenWork={onOpenWork} getCreatorNames={getCreatorNames} />
      </aside>
    </div>}
    <section className="cu-shelf" aria-labelledby="cu-catalog-heading">
      <div className="cu-shelf-title">
        <div><h1 id="cu-catalog-heading" ref={heading} tabIndex={-1}>{browseHeading}</h1>
          <p aria-live="polite" aria-atomic="true">{search ? "“" + search + "” · " + entries.length + "개 작품" : rankedView ? "감상 수, 평점, 회차 수를 반영한 샘플 작품 순위" : null}</p>
        </div>
        {!rankedView && <label className="cu-sort"><span className="cu-visually-hidden">작품 정렬</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">추천순</option><option value="popular">인기순</option><option value="rating">평점순</option>
          </select>
        </label>}
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
        <div className="cu-works-grid">{entries.map((work) => (
          <button className="cu-work-tile" type="button" key={work.id} onClick={() => onOpenWork(work)}>
            <span className="cu-tile-image">
              <img src={work.coverImage} loading="lazy" alt="" />
              <span className="cu-tile-format">{work.format}</span>
            </span>
            <strong>{work.title}</strong>
            <span className="cu-tile-byline">{getCreatorNames(work).join(" · ") || work.genre}</span>
            <span className="cu-tile-stats"><Star size={12} fill="currentColor" /> {work.rating.toFixed(1)} <i /> {work.episodes}화</span>
          </button>
        ))}</div>}
    </section>
  </div>;
}
