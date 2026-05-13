import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  CheckCircle2,
  Coins,
  CreditCard,
  Flame,
  Globe2,
  Heart,
  Headphones,
  Home,
  LogIn,
  LogOut,
  Maximize2,
  Menu,
  MessageCircle,
  Minimize2,
  Moon,
  Play,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Split,
  Star,
  Sun,
  UserRound,
  Users,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";

const DEFAULT_PRODUCTION_API_URL = "https://creator-universe-api-7qfc.onrender.com";
const DEFAULT_LOCAL_API_URL = "http://127.0.0.1:4000";

function resolveApiUrl() {
  const configuredValue = String(import.meta.env.VITE_API_URL || "").trim();
  const configuredUrl = configuredValue
    .replace(/^VITE_API_URL\s*=\s*/i, "")
    .trim()
    .replace(/\/$/, "");

  if (configuredUrl) {
    try {
      const host = new URL(configuredUrl).hostname;
      const isFrontendDeployment = host.endsWith(".vercel.app") || host.includes("limyoobins-projects");
      if (!isFrontendDeployment) {
        return configuredUrl;
      }
    } catch {
      return import.meta.env.PROD ? DEFAULT_PRODUCTION_API_URL : DEFAULT_LOCAL_API_URL;
    }
  }

  return import.meta.env.PROD ? DEFAULT_PRODUCTION_API_URL : DEFAULT_LOCAL_API_URL;
}

const API_URL = resolveApiUrl();
const PROJECT_ID = "project-midnight-signal";

type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
};

type CreatorChatMessage = {
  from: "me" | "creator";
  text: string;
  time: string;
  createdAt: string;
  matchRequestId?: string;
  matchProposal?: MatchProposalPayload | null;
};

type ChatThread = {
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    userType: string;
    primaryRole: string | null;
    responseRate: number | null;
    headline: string;
  };
  messages: Array<{
    id: string;
    senderId: string;
    receiverUserId: string;
    body: string;
    createdAt: string;
    from: "me" | "creator";
    matchRequestId?: string;
    matchProposal?: MatchProposalPayload | null;
  }>;
};

type MatchProposalPayload = {
  id: string;
  projectTitle: string;
  projectType: string;
  memberRole: string;
  sharePercentage: number;
  message: string;
  requesterName?: string;
  targetName?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
};

type Creator = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  primaryRole: string;
  headline: string;
  bio: string;
  skills: string[];
  availabilityNote?: string;
  responseRate: number;
  followerCount: number;
  completedProjects: number;
  portfolioSummary?: string;
  portfolioItems?: Array<{
    title: string;
    category: string;
    description: string;
    tags: string[];
  }>;
  voiceDemo?: {
    title: string;
    durationSeconds: number;
    waveform: number[];
  } | null;
};

type SettlementDashboard = {
  grossAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  appliedFeeRate: number;
  members: Array<{
    userId: string;
    displayName: string;
    username: string;
    memberRole: string;
    sharePercentage: number;
    expectedSettlement: number;
  }>;
  mySettlement: {
    sharePercentage: number;
    amount: number;
  };
};

type SettlementMemberConfig = {
  userId: string;
  displayName: string;
  username: string;
  memberRole: string;
  sharePercentage: number;
};

type SettlementConfig = {
  platformFeeRate: number;
  members: SettlementMemberConfig[];
};

type Project = {
  title: string;
  synopsis?: string;
  priceCoins: number;
  hasAccess: boolean;
  appliedFeeRate: number;
};

type PolicyTabId = "privacy" | "terms" | "refund" | "legal" | "sitemap";

type WalletTransaction = {
  id: string;
  type: "CHARGE" | "SPEND" | "SETTLEMENT" | "REFUND" | "BONUS";
  title: string;
  description: string;
  amount: number;
  status: "완료" | "대기" | "환불 가능" | "실패";
  createdAt: string;
  projectTitle?: string;
};

type WalletDetail = {
  balance: number;
  monthlySpend: number;
  monthlyEarned: number;
  refundableCoins: number;
  bonusCoins: number;
  autoChargeEnabled: boolean;
  nextChargeDate: string;
  paymentMethod: string;
  payoutAccount: string;
  transactions: WalletTransaction[];
};

type PremiumSubscriptionState = {
  isActive: boolean;
  nextBillingDate: string;
  startedAt?: string;
  cancelledAt?: string;
};

type ContentReview = {
  id: string;
  workId: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  WRITER: "글",
  ILLUSTRATOR: "그림",
  VOICE_ACTOR: "목소리",
  SOUND_DIRECTOR: "BGM",
  PRODUCER: "프로듀서",
  EDITOR: "에디터",
};

const roleFilterItems = ["ALL", "WRITER", "ILLUSTRATOR", "VOICE_ACTOR", "SOUND_DIRECTOR"];

const defaultSettlementMembers: SettlementMemberConfig[] = [
  { userId: "writer-demo", displayName: "작가", username: "writer", memberRole: "WRITER", sharePercentage: 30 },
  { userId: "illust-demo", displayName: "일러스트", username: "illust", memberRole: "ILLUSTRATOR", sharePercentage: 30 },
  { userId: "voice-demo", displayName: "성우", username: "voice", memberRole: "VOICE_ACTOR", sharePercentage: 40 },
];

const genreFilters = [
  "전체",
  "미스터리",
  "판타지",
  "로맨스",
  "도시괴담",
  "네온",
  "키비주얼",
  "캐릭터",
  "내레이션",
  "감정연기",
  "ASMR",
  "BGM",
  "3D",
  "앰비언트",
];

const matchingContentFilters = ["전체", "소설", "웹툰", "만화", "애니메이션", "오디오드라마", "믹스미디어"];
const matchingGenreFilters = ["로맨스", "판타지", "미스터리", "스릴러", "일상", "BL", "힐링", "ASMR", "BGM"];

const readerFormatFilters = ["전체", "소설", "웹툰", "만화", "애니메이션", "오디오드라마", "믹스미디어"];
const readerGenreFilters = ["로맨스", "판타지", "미스터리", "스릴러", "일상", "BL", "힐링"];
const libraryViewItems = [
  { id: "all", label: "전체 작품" },
  { id: "recent", label: "최근 본 작품" },
  { id: "purchased", label: "결제한 작품" },
  { id: "scrapped", label: "스크랩" },
] as const;

const readerWorks = [
  {
    id: "midnight-signal",
    title: "미드나잇 시그널",
    coverImage: "/covers/midnight-signal.svg",
    participantUserIds: ["user-yurino", "user-renka", "user-haruka", "user-ion"],
    format: "오디오드라마",
    genre: "미스터리",
    subGenre: "오디오드라마 · 도시괴담",
    tagline: "비 오는 도시의 라디오 주파수에서 사라진 목소리를 추적하는 이야기.",
    tags: ["미스터리", "스릴러", "보이스드라마", "고대비"],
    priceCoins: 1000,
    rating: 4.9,
    listeners: "12.4만",
    episodes: 8,
    badge: "오늘의 추천",
    tone: "mystery",
  },
  {
    id: "starlight-contract",
    title: "별빛 계약 연애",
    coverImage: "/covers/starlight-contract.svg",
    participantUserIds: ["user-yurino", "user-renka", "user-haruka"],
    format: "웹소설",
    genre: "로맨스",
    subGenre: "웹소설 · 로맨스 판타지",
    tagline: "작가와 일러스트레이터가 만든 연재형 웹소설. 인기 회차는 성우 더빙판으로 확장됩니다.",
    tags: ["소설", "웹소설", "로맨스", "판타지", "삽화"],
    priceCoins: 700,
    rating: 4.8,
    listeners: "8.7만",
    episodes: 12,
    badge: "로맨스 급상승",
    tone: "romance",
  },
  {
    id: "dragon-archive",
    title: "용의 기록 보관소",
    coverImage: "/covers/dragon-archive.svg",
    participantUserIds: ["user-yurino", "user-renka", "user-ion"],
    format: "웹툰",
    genre: "판타지",
    subGenre: "웹툰 · 정통 판타지",
    tagline: "그림 작가와 스토리 작가가 공동 제작한 세로 스크롤 웹툰. BGM 버전도 함께 준비 중입니다.",
    tags: ["웹툰", "판타지", "모험", "세계관", "BGM강점"],
    priceCoins: 900,
    rating: 4.7,
    listeners: "6.1만",
    episodes: 15,
    badge: "세계관 추천",
    tone: "fantasy",
  },
  {
    id: "after-school-ghost",
    title: "방과 후 괴담부",
    coverImage: "/covers/after-school-ghost.svg",
    participantUserIds: ["user-yurino", "user-renka", "user-haruka", "user-ion"],
    format: "만화",
    genre: "스릴러",
    subGenre: "출판만화 · 학원 스릴러",
    tagline: "콘티, 펜선, 채색, 효과음 팀이 함께 만든 에피소드형 만화. 오디오 코멘터리도 지원합니다.",
    tags: ["만화", "스릴러", "미스터리", "학원물", "콘티"],
    priceCoins: 800,
    rating: 4.6,
    listeners: "5.9만",
    episodes: 10,
    badge: "입체음향",
    tone: "thriller",
  },
  {
    id: "cafe-orbit",
    title: "궤도 카페의 하루",
    coverImage: "/covers/cafe-orbit.svg",
    participantUserIds: ["user-yurino", "user-renka", "user-ion"],
    format: "믹스미디어",
    genre: "힐링",
    subGenre: "일러스트 에세이 · ASMR",
    tagline: "짧은 글, 배경 일러스트, ASMR 사운드가 함께 제공되는 감성형 협업 콘텐츠.",
    tags: ["믹스미디어", "힐링", "일상", "ASMR", "앰비언트"],
    priceCoins: 500,
    rating: 4.9,
    listeners: "4.8만",
    episodes: 6,
    badge: "잠들기 전 추천",
    tone: "healing",
  },
  {
    id: "blue-hour-roommate",
    title: "블루아워 룸메이트",
    coverImage: "/covers/blue-hour-roommate.svg",
    participantUserIds: ["user-yurino", "user-renka", "user-haruka"],
    format: "웹소설",
    genre: "BL",
    subGenre: "웹소설 · 청춘 BL",
    tagline: "작가의 본편 연재와 일러스트레이터의 삽화, 성우 보이스 특전이 함께 열리는 팬덤형 작품.",
    tags: ["소설", "웹소설", "BL", "청춘", "로맨스", "보이스특전"],
    priceCoins: 700,
    rating: 4.8,
    listeners: "7.2만",
    episodes: 9,
    badge: "팬덤 추천",
    tone: "blue",
  },
  {
    id: "painted-planet",
    title: "채색 행성의 아이들",
    coverImage: "/covers/painted-planet.svg",
    participantUserIds: ["user-renka", "user-yurino"],
    format: "웹툰",
    genre: "일상",
    subGenre: "웹툰 · 성장 드라마",
    tagline: "인디 일러스트 팀과 작가가 함께 만드는 컬러풀 성장 웹툰. 팬 후원으로 보이스 예고편을 제작합니다.",
    tags: ["웹툰", "일상", "성장", "컬러", "팬후원"],
    priceCoins: 600,
    rating: 4.7,
    listeners: "3.6만",
    episodes: 14,
    badge: "신규 웹툰",
    tone: "comic",
  },
  {
    id: "paper-moon-diary",
    title: "종이달 관찰일지",
    coverImage: "/covers/paper-moon-diary.svg",
    participantUserIds: ["user-yurino", "user-renka", "user-ion"],
    format: "소설",
    genre: "미스터리",
    subGenre: "연재소설 · 서정 미스터리",
    tagline: "챕터마다 삽화와 BGM 큐시트가 붙는 연재소설. 추후 오디오북으로 확장 가능한 IP입니다.",
    tags: ["소설", "미스터리", "삽화", "BGM", "오디오북확장"],
    priceCoins: 400,
    rating: 4.8,
    listeners: "2.9만",
    episodes: 20,
    badge: "작가 추천",
    tone: "novel",
  },
  {
    id: "neon-pulse-zero",
    title: "네온 펄스 제로",
    coverImage: "/covers/neon-pulse-zero.svg",
    participantUserIds: ["user-renka", "user-haruka", "user-ion"],
    format: "애니메이션",
    genre: "판타지",
    subGenre: "숏폼 애니메이션 · SF 판타지",
    tagline: "웹툰 원작을 90초 파일럿 애니메이션으로 확장한 작품. 작가, 애니메이터, 성우, BGM 팀이 함께 제작합니다.",
    tags: ["애니메이션", "판타지", "SF", "파일럿", "성우더빙", "BGM"],
    priceCoins: 1200,
    rating: 4.9,
    listeners: "4.1만",
    episodes: 4,
    badge: "애니 파일럿",
    tone: "animation",
  },
];

type ReaderWork = (typeof readerWorks)[number];

const audioWaveBars = [18, 30, 44, 26, 52, 34, 62, 28, 48, 38, 58, 24, 46, 32, 54, 22, 40, 30];

function hasAudioExperience(work: ReaderWork) {
  return (
    work.format === "오디오드라마" ||
    work.format === "믹스미디어" ||
    work.tags.some((tag) => ["보이스드라마", "보이스특전", "BGM", "ASMR", "앰비언트", "오디오북확장", "성우더빙"].includes(tag))
  );
}

function getAudioExperienceLabel(work: ReaderWork) {
  if (work.format === "오디오드라마") {
    return "오디오드라마";
  }
  if (work.tags.includes("보이스특전") || work.tags.includes("성우더빙")) {
    return "보이스 특전";
  }
  if (work.tags.includes("BGM") || work.tags.includes("앰비언트") || work.tags.includes("ASMR")) {
    return "사운드 특전";
  }
  return "오디오 확장";
}

const contentFormatCards = [
  {
    title: "웹소설",
    label: "Story First",
    text: "작가가 원작을 연재하고 일러스트, 표지, 보이스 특전으로 확장합니다.",
  },
  {
    title: "웹툰·만화",
    label: "Visual IP",
    text: "콘티, 펜선, 채색, 배경, 효과음 팀이 에피소드 단위로 협업합니다.",
  },
  {
    title: "오디오드라마",
    label: "Voice Expansion",
    text: "성우, BGM, 사운드 디자이너가 기존 IP를 배리어프리 감상 경험으로 넓힙니다.",
  },
  {
    title: "애니메이션",
    label: "Motion IP",
    text: "웹툰과 소설 IP를 숏폼 파일럿, 티저, 오프닝 영상으로 확장합니다.",
  },
  {
    title: "믹스미디어",
    label: "Fan Package",
    text: "글, 이미지, 음성, ASMR, 비하인드 콘텐츠를 묶어 팬덤형 상품으로 판매합니다.",
  },
];

const creatorFanPosts = [
  {
    id: "post-yurino-rough",
    creatorUserId: "user-yurino",
    title: "미드나잇 시그널 미공개 대사 노트",
    type: "작업노트",
    access: "구독자 전용",
    priceCoins: 300,
    description: "본편에서 삭제된 독백과 작가 코멘터리를 묶은 팬 전용 포스트입니다.",
    tone: "mystery",
  },
  {
    id: "post-yurino-short",
    creatorUserId: "user-yurino",
    title: "종이달 관찰일지 외전 4컷 대본",
    type: "짧은 글",
    access: "코인 열람",
    priceCoins: 500,
    description: "후원자 요청으로 제작한 짧은 외전 대본과 캐릭터 설정 메모입니다.",
    tone: "novel",
  },
  {
    id: "post-renka-illust",
    creatorUserId: "user-renka",
    title: "렌카의 네온 키비주얼 PSD 비하인드",
    type: "일러스트",
    access: "구독자 전용",
    priceCoins: 700,
    description: "레이어 구성, 러프, 컬러 팔레트까지 확인할 수 있는 작업 비하인드입니다.",
    tone: "comic",
  },
  {
    id: "post-renka-sticker",
    creatorUserId: "user-renka",
    title: "채색 행성 SD 캐릭터 짤 모음",
    type: "이미지팩",
    access: "코인 열람",
    priceCoins: 400,
    description: "프로필 배너와 댓글 리액션에 쓸 수 있는 팬아트 이미지팩입니다.",
    tone: "romance",
  },
  {
    id: "post-haruka-voice",
    creatorUserId: "user-haruka",
    title: "하루카 보이스 샘플: 비 오는 밤",
    type: "보이스",
    access: "구독자 전용",
    priceCoins: 600,
    description: "성우가 직접 녹음한 30초 감정 연기 샘플과 녹음 코멘터리입니다.",
    tone: "blue",
  },
  {
    id: "post-ion-bgm",
    creatorUserId: "user-ion",
    title: "궤도 카페 앰비언트 루프",
    type: "BGM",
    access: "무료 공개",
    priceCoins: 0,
    description: "작품 분위기를 먼저 체험할 수 있는 20초 무료 앰비언트 미리듣기입니다.",
    tone: "healing",
  },
];

const creatorMembershipPlans = [
  {
    name: "Fan Light",
    price: 900,
    benefits: ["후원자 전용 글/이미지 열람", "신작 알림", "월간 제작 노트"],
  },
  {
    name: "Studio Fan",
    price: 2900,
    benefits: ["비공개 러프/짤 이미지팩", "보이스/BGM 특전", "댓글 우선 답변"],
  },
  {
    name: "Producer",
    price: 5900,
    benefits: ["크레딧 닉네임 표기", "월 1회 Q&A", "파일럿 선공개"],
  },
];

const universePremiumBenefits = [
  "작품 페이지 내 배너 광고 제거",
  "매월 1,000 보너스 코인 지급",
  "프리미엄 작품 선공개와 고화질 이미지 보기",
  "오디오 백그라운드 재생과 오프라인 저장 데모",
];

type PageId = "home" | "discover" | "studio" | "matching" | "wallet" | "settlement" | "support";
type LibraryViewId = (typeof libraryViewItems)[number]["id"];
type NotificationTone = "match" | "wallet" | "content" | "studio" | "settlement" | "premium" | "marketing";

type StudioDraftState = {
  title: string;
  format: string;
  genre: string;
  synopsis: string;
  episodeTitle: string;
  accessType: string;
  priceCoins: number;
  publishMode: string;
  scheduledAt: string;
  previewText: string;
  uploadMemo: string;
};

type StudioFanPostDraftState = {
  title: string;
  postType: string;
  accessType: string;
  tierName: string;
  priceCoins: number;
  summary: string;
  releaseNote: string;
};

type StudioAccessibilityAuditState = {
  transcriptSync: number;
  contrastMode: string;
  screenReader: string;
  audioLevel: string;
  keyboardFlow: string;
  altTextStatus: string;
  qaMemo: string;
};

type NotificationPreferences = {
  newEpisode: boolean;
  settlement: boolean;
  marketing: boolean;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  page: PageId;
  tone: NotificationTone;
  actionLabel: string;
  libraryView?: LibraryViewId;
  openAccount?: boolean;
};

const navItems: Array<{ id: PageId; label: string; helper: string }> = [
  { id: "home", label: "홈", helper: "서비스 소개" },
  { id: "discover", label: "작품", helper: "장르 탐색" },
  { id: "studio", label: "스튜디오", helper: "작품 관리" },
  { id: "matching", label: "매칭", helper: "팀원 찾기" },
  { id: "wallet", label: "지갑", helper: "코인 관리" },
  { id: "settlement", label: "정산", helper: "수익 분배" },
  { id: "support", label: "고객센터", helper: "문의/신고" },
];

const marketingAnnouncements = [
  {
    id: "marketing-spring-coin",
    title: "신규 창작팀 응원 코인 이벤트",
    body: "이번 주 첫 후원 시 보너스 코인과 추천 작품 알림을 받을 수 있어요.",
    actionLabel: "이벤트 보기",
  },
  {
    id: "marketing-premium-preview",
    title: "프리미엄 멤버십 선공개 혜택",
    body: "광고 없는 감상과 월 1,000 보너스 코인을 묶은 구독 혜택을 확인해보세요.",
    actionLabel: "구독 보기",
  },
];

const newEpisodeAlertMap: Record<string, { title: string; episodeLabel: string; publishedAt: string }> = {
  "midnight-signal": { title: "9화. 끊어진 주파수", episodeLabel: "신규 오디오드라마 회차", publishedAt: "오늘" },
  "starlight-contract": { title: "13화. 별빛 아래의 계약서", episodeLabel: "신규 웹소설 회차", publishedAt: "오늘" },
  "dragon-archive": { title: "16화. 용의 문서고", episodeLabel: "신규 웹툰 회차", publishedAt: "어제" },
  "cafe-orbit": { title: "7화. 새벽 라떼 ASMR", episodeLabel: "신규 믹스미디어 회차", publishedAt: "오늘" },
  "blue-hour-roommate": { title: "10화. 룸메이트의 고백", episodeLabel: "신규 보이스 특전", publishedAt: "오늘" },
  "neon-pulse-zero": { title: "5화. 파일럿 컷 공개", episodeLabel: "신규 애니메이션 회차", publishedAt: "오늘" },
};

const protectedPages = new Set<PageId>(["studio", "matching", "wallet", "settlement", "support"]);

const walletFallback: WalletDetail = {
  balance: 0,
  monthlySpend: 0,
  monthlyEarned: 0,
  refundableCoins: 0,
  bonusCoins: 0,
  autoChargeEnabled: false,
  nextChargeDate: "-",
  paymentMethod: "등록된 대표 결제 수단 없음",
  payoutAccount: "정산 계좌 등록 필요",
  transactions: [],
};

const coinProducts = [
  { id: "coin-1000", title: "베이직 충전", coins: 1000, priceKrw: 1000, badge: "가볍게 시작" },
  { id: "coin-3000", title: "인기 충전팩", coins: 3000, priceKrw: 3000, badge: "인기" },
  { id: "coin-5000", title: "스튜디오 후원팩", coins: 5000, priceKrw: 5000, badge: "창작자 추천" },
];

const introSlides = [
  {
    eyebrow: "Creator Collaboration",
    title: "흩어진 창작자를 하나의 오디오 스튜디오로",
    description:
      "작가, 일러스트레이터, 성우, BGM 크리에이터가 포트폴리오를 보고 팀을 만들고 작품 단위로 협업하는 서브컬처 창작 허브입니다.",
    stat: "4 Roles",
    statLabel: "글 · 그림 · 목소리 · BGM",
    visualTitle: "Creator Universe Studio",
    visualLabel: "Collaboration Hub",
    tone: "pink",
  },
  {
    eyebrow: "Smart Settlement",
    title: "돈 문제는 시스템이 맡고, 팀은 창작에 집중",
    description:
      "프로젝트 생성 시 합의한 30:30:40 지분율을 저장하고, 독자 결제 즉시 수수료 차감 후 팀원 지갑으로 자동 분배합니다.",
    stat: "1/N",
    statLabel: "자동 정산 분배",
    visualTitle: "Smart Split Engine",
    visualLabel: "Auto Settlement",
    tone: "cyan",
  },
  {
    eyebrow: "Barrier-free Audio",
    title: "시각장애인도 함께 즐기는 몰입형 콘텐츠",
    description:
      "고대비 오디오 감상, 대본-음성 싱크, 보이스 퍼스트 UX로 서브컬처 콘텐츠 접근성을 넓히는 ESG형 플랫폼입니다.",
    stat: "Voice",
    statLabel: "First UX",
    visualTitle: "Barrier-free Access",
    visualLabel: "Accessible Audio",
    tone: "violet",
  },
];

const featureCards = [
  {
    icon: <Users size={24} />,
    title: "다자간 매칭",
    text: "창작자 직군별 포트폴리오와 음성 샘플을 확인하고 프로젝트 팀을 빠르게 구성합니다.",
  },
  {
    icon: <Split size={24} />,
    title: "스마트 자동 정산",
    text: "수익 분배율, 수수료율, 결제 트랜잭션을 연결해 협업에서 가장 민감한 정산 갈등을 줄입니다.",
  },
  {
    icon: <Headphones size={24} />,
    title: "몰입형 오디오 감상",
    text: "대본이 노래방 가사처럼 강조되고 오디오 진행률과 함께 흘러가는 배리어프리 감상 환경입니다.",
  },
  {
    icon: <Globe2 size={24} />,
    title: "글로벌 협업 확장",
    text: "AI 번역, 로컬라이징, 해외 성우 협업까지 확장 가능한 오디오 IP 유통 구조를 지향합니다.",
  },
];

const roadmapItems = [
  "1주차: 시장 분석, 유저 시나리오, 정산 ERD 설계",
  "2주차: 보이스 퍼스트 UX와 창작자 대시보드 디자인",
  "3주차: 오디오 스트리밍, 자동 정산, 결제 MVP 개발",
];

const audienceSegments = [
  {
    title: "초기 창작팀",
    label: "Team Building",
    text: "외주비를 선불로 감당하기 어려운 작가와 일러스트레이터가 수익 공유형 팀을 만들 수 있습니다.",
  },
  {
    title: "성우 지망생",
    label: "Voice Portfolio",
    text: "작품 단위 포트폴리오와 음성 샘플을 쌓아 팬덤과 실전 경험을 동시에 확보합니다.",
  },
  {
    title: "시각장애인 독자",
    label: "Accessible Fan",
    text: "기계음이 아닌 감정 연기 기반 오디오 콘텐츠로 트렌디한 서브컬처를 즐길 수 있습니다.",
  },
];

const serviceFlow = [
  "포트폴리오 발견",
  "프로젝트 팀 구성",
  "지분율 합의 등록",
  "코인 결제 발생",
  "수수료 차감",
  "지갑 자동 정산",
];

const partnerPlans = [
  {
    name: "Starter",
    fee: "15%",
    target: "일반 창작팀",
    perks: ["초기 매칭 수수료 0원", "기본 정산 대시보드", "오디오 감상 기능 배포"],
  },
  {
    name: "Universe Partner",
    fee: "8%",
    target: "우수 협업팀",
    perks: ["파트너 수수료 감면", "홈 추천 노출", "팬덤 커뮤니티 확장"],
  },
];

const growthTimeline = [
  { year: "MVP", title: "교내 창작자 베타", text: "웹소설·성우·일러스트 창작자를 대상으로 매칭과 정산 흐름을 검증합니다." },
  { year: "Beta", title: "배리어프리 현장 테스트", text: "복지기관과 연계해 화면 낭독, 고대비 감상 모드, 제스처 접근성을 개선합니다." },
  { year: "Scale", title: "글로벌 오디오 IP 확장", text: "AI 번역과 로컬라이징으로 한국 IP와 해외 성우 협업을 연결합니다." },
];

function formatCoins(value = 0) {
  return `${Number(value).toLocaleString("ko-KR")} 코인`;
}

function formatWon(value = 0) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function parseAudienceCount(value: string) {
  const normalized = value.replace(",", "").trim();
  if (normalized.endsWith("만")) {
    return Number(normalized.replace("만", "")) * 10000;
  }
  return Number(normalized.replace(/[^\d.]/g, "")) || 0;
}

function getWorkRankScore(work: ReaderWork) {
  return parseAudienceCount(work.listeners) + work.rating * 1000 + work.episodes * 120;
}

function readStoredIds(key: string, fallback: string[] = []) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

function getUserLibraryStorageKey(userId: string, key: "purchased-works" | "scrapped-works" | "recent-works" | "read-notifications") {
  return `creator-universe-user-${userId}-${key}`;
}

const defaultNotificationPreferences: NotificationPreferences = {
  newEpisode: true,
  settlement: true,
  marketing: false,
};

function readNotificationPreferences(): NotificationPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem("creator-universe-notification-preferences") || "null");
    return {
      ...defaultNotificationPreferences,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
  } catch {
    return defaultNotificationPreferences;
  }
}

const premiumStorageKey = "creator-universe-premium-subscriptions";

function getNextPremiumBillingDate(base = new Date()) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

function createInactivePremiumSubscription(): PremiumSubscriptionState {
  return {
    isActive: false,
    nextBillingDate: getNextPremiumBillingDate(),
  };
}

function readPremiumSubscriptionRecord() {
  try {
    const parsed = JSON.parse(localStorage.getItem(premiumStorageKey) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, PremiumSubscriptionState>) : {};
  } catch {
    return {};
  }
}

function readUserPremiumSubscription(userId: string) {
  return readPremiumSubscriptionRecord()[userId] ?? createInactivePremiumSubscription();
}

function writeUserPremiumSubscription(userId: string, subscription: PremiumSubscriptionState) {
  const record = readPremiumSubscriptionRecord();
  record[userId] = subscription;
  localStorage.setItem(premiumStorageKey, JSON.stringify(record));
}

function getWalletTypeLabel(type: WalletTransaction["type"]) {
  const labels: Record<WalletTransaction["type"], string> = {
    CHARGE: "충전",
    SPEND: "사용",
    SETTLEMENT: "정산입금",
    REFUND: "환불",
    BONUS: "보너스",
  };

  return labels[type];
}

function formatChatTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function isBrokenDisplayText(value?: string | null) {
  if (!value) {
    return true;
  }

  const normalized = value.trim();

  return (
    /[�諛援肄踰媛蹂쒓꾩먯좊꾨誘몄젣寃곗愿李梨]/.test(normalized) ||
    /\?{2,}/.test(normalized) ||
    /API \?/.test(normalized) ||
    /^deleted[_\s-]/i.test(normalized) ||
    /^Deleted user/i.test(normalized) ||
    /^\?+[a-z0-9-]{6,}$/i.test(normalized)
  );
}

function cleanDisplayText(value: string | null | undefined, fallback: string) {
  if (isBrokenDisplayText(value)) {
    return fallback;
  }

  return value!.trim();
}

function normalizeCreator(creator: Creator): Creator {
  const roleLabel = roleLabels[creator.primaryRole] || "창작자";

  return {
    ...creator,
    username: cleanDisplayText(creator.username, creator.id || "creator"),
    displayName: cleanDisplayText(creator.displayName, `${roleLabel} 크리에이터`),
    headline: cleanDisplayText(creator.headline, `${roleLabel} 포트폴리오를 준비 중입니다.`),
    bio: cleanDisplayText(creator.bio, "프로젝트 협업을 위한 창작자 프로필입니다."),
    availabilityNote: cleanDisplayText(creator.availabilityNote, "협업 가능"),
    portfolioSummary: cleanDisplayText(creator.portfolioSummary, `${roleLabel} 작업 샘플을 확인해보세요.`),
    skills: creator.skills?.length ? creator.skills.map((skill) => cleanDisplayText(skill, roleLabel)) : [roleLabel],
    portfolioItems: creator.portfolioItems?.map((item, index) => ({
      ...item,
      title: cleanDisplayText(item.title, `${roleLabel} 포트폴리오 ${index + 1}`),
      category: cleanDisplayText(item.category, `${roleLabel} 샘플`),
      description: cleanDisplayText(item.description, "작품 제작과 협업에 활용할 수 있는 포트폴리오입니다."),
      tags: item.tags?.length ? item.tags.map((tag) => cleanDisplayText(tag, roleLabel)) : [roleLabel],
    })),
    voiceDemo: creator.voiceDemo
      ? {
          ...creator.voiceDemo,
          title: cleanDisplayText(creator.voiceDemo.title, "보이스 샘플"),
        }
      : creator.voiceDemo,
  };
}

function normalizeChatMessageText(text: string, fallback = "협업 상담 메시지입니다.") {
  return cleanDisplayText(text, fallback);
}

function normalizeContentReview(review: ContentReview): ContentReview {
  return {
    ...review,
    authorName: cleanDisplayText(review.authorName, "독자"),
    body: cleanDisplayText(review.body, "작품을 응원하는 리뷰입니다."),
  };
}

function getSettlementMemberFallback(memberRole: string, index: number) {
  const roleLabel = roleLabels[memberRole] || "팀원";
  return `${roleLabel} 팀원 ${index + 1}`;
}

function normalizeSettlementMember(member: SettlementMemberConfig, index: number): SettlementMemberConfig {
  const fallbackName = getSettlementMemberFallback(member.memberRole, index);
  const fallbackUsername = `member-${index + 1}`;

  return {
    ...member,
    displayName: cleanDisplayText(member.displayName, fallbackName),
    username: cleanDisplayText(member.username, fallbackUsername),
  };
}

function getWorkEpisodes(work: ReaderWork) {
  const episodeCount = Math.max(1, Math.min(work.episodes, 12));
  const episodeTitles = [
    "프롤로그: 세계관의 문이 열리다",
    "첫 번째 신호",
    "낯선 동료의 제안",
    "감춰진 장면의 목소리",
    "비밀 파일럿 공개",
    "팬덤이 움직이는 밤",
    "반전의 크레딧",
    "다음 시즌을 향해",
  ];

  return Array.from({ length: episodeCount }, (_, index) => {
    const episodeNumber = index + 1;
    const isFree = episodeNumber === 1;
    return {
      id: `${work.id}-episode-${episodeNumber}`,
      episodeNumber,
      title: episodeTitles[index] ?? `${episodeNumber}화. ${work.genre} 에피소드`,
      summary:
        episodeNumber === 1
          ? "작품의 분위기와 협업팀의 색깔을 무료로 확인할 수 있는 첫 회차입니다."
          : `${work.format} 형식에 맞춰 제작된 ${work.genre} 회차입니다. 구매 후 전체 내용을 감상할 수 있습니다.`,
      priceCoins: isFree ? 0 : work.priceCoins,
      readingTime: work.format === "오디오드라마" ? `${8 + index}분` : `${5 + Math.min(index, 6)}분`,
      publishedAt: `2026.05.${String(Math.min(episodeNumber + 2, 28)).padStart(2, "0")}`,
      isFree,
    };
  });
}

function mapChatThreads(threads: ChatThread[]) {
  return threads.reduce<Record<string, CreatorChatMessage[]>>((acc, thread) => {
    acc[thread.otherUser.id] = thread.messages.map((message) => ({
      from: message.from,
      text: normalizeChatMessageText(message.body),
      time: formatChatTime(message.createdAt),
      createdAt: message.createdAt,
      matchRequestId: message.matchRequestId,
      matchProposal: message.matchProposal,
    }));
    return acc;
  }, {});
}

function buildSettlementConfig(settlement: SettlementDashboard | null): SettlementConfig {
  return {
    platformFeeRate: Math.round((settlement?.appliedFeeRate ?? 0.15) * 100),
    members: settlement?.members.length
      ? settlement.members.map((member, index) => normalizeSettlementMember({
          userId: member.userId,
          displayName: member.displayName,
          username: member.username,
          memberRole: member.memberRole,
          sharePercentage: member.sharePercentage,
        }, index))
      : defaultSettlementMembers,
  };
}

function getCreatorPortfolio(creator: Creator) {
  if (creator.portfolioItems?.length) {
    return creator.portfolioItems;
  }

  const fallback: Record<string, Creator["portfolioItems"]> = {
    WRITER: [
      {
        title: "비 오는 골목의 라디오",
        category: "미스터리 · 감성 웹소설",
        description: "사라진 성우의 녹음 파일을 따라가는 도시괴담풍 오디오 드라마 각색 샘플입니다.",
        tags: ["미스터리", "감정선", "대사"],
      },
      {
        title: "유리성의 마지막 독백",
        category: "판타지 · 독백극",
        description: "성우 연기에 맞춰 호흡을 짧게 나누고 장면 전환을 선명하게 만든 대본 포트폴리오입니다.",
        tags: ["판타지", "독백", "각색"],
      },
    ],
    ILLUSTRATOR: [
      {
        title: "Neon Alley Key Visual",
        category: "오디오 드라마 키비주얼",
        description: "비 오는 네온 거리와 캐릭터 실루엣을 활용한 표지형 일러스트 작업입니다.",
        tags: ["키비주얼", "네온", "배경"],
      },
      {
        title: "Signal Character Sheet",
        category: "캐릭터 시트",
        description: "성우 톤과 장면 분위기에 맞춰 표정, 의상, 컬러 팔레트를 정리한 캐릭터 설정화입니다.",
        tags: ["캐릭터", "표정", "컨셉"],
      },
    ],
    VOICE_ACTOR: [
      {
        title: "차분한 밤의 내레이션",
        category: "내레이션 · 저음톤",
        description: "저시력자도 장면을 상상할 수 있도록 공간감과 감정선을 또렷하게 전달하는 샘플입니다.",
        tags: ["내레이션", "저음", "감정"],
      },
      {
        title: "추격 장면 감정 연기",
        category: "드라마 연기",
        description: "호흡, 떨림, 속도 변화를 활용한 긴박한 장면 연기 포트폴리오입니다.",
        tags: ["연기", "긴장감", "호흡"],
      },
    ],
    SOUND_DIRECTOR: [
      {
        title: "Rain Alley Ambience",
        category: "앰비언트 · 3D 오디오",
        description: "빗소리, 간판 전기음, 발걸음이 공간 안에서 움직이도록 설계한 사운드스케이프입니다.",
        tags: ["앰비언트", "3D", "폴리"],
      },
      {
        title: "Opening Theme Loop",
        category: "BGM · 루프",
        description: "웹소설 오프닝에 어울리는 45초 루프형 시그널 BGM입니다.",
        tags: ["BGM", "루프", "신스"],
      },
    ],
  };

  return fallback[creator.primaryRole] || [];
}

const apiConnectionErrorMessage = "백엔드 서버에 연결할 수 없습니다. VITE_API_URL 또는 Render 배포 상태를 확인해 주세요.";
const apiResponseParseErrorMessage = "API 응답을 읽을 수 없습니다. 프론트가 백엔드가 아닌 페이지 응답을 받았습니다.";
async function request<T>(path: string, token: string | null, options: RequestInit = {}) {
  const apiBases = [
    API_URL,
    import.meta.env.PROD && API_URL !== DEFAULT_PRODUCTION_API_URL ? DEFAULT_PRODUCTION_API_URL : "",
  ].filter((baseUrl, index, list) => baseUrl && list.indexOf(baseUrl) === index);
  let lastError = new Error("백엔드 서버에 연결할 수 없습니다. VITE_API_URL 또는 Render 배포 상태를 확인해 주세요.");

  lastError = new Error(apiConnectionErrorMessage);

  for (const baseUrl of apiBases) {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    } catch {
      lastError = new Error("백엔드 서버에 연결할 수 없습니다. VITE_API_URL 또는 Render 배포 상태를 확인해 주세요.");
      continue;
    }

    const rawText = await response.text();
    let payload: { message?: string; data: T };
    try {
      payload = rawText ? JSON.parse(rawText) : { success: response.ok, data: null as T };
    } catch {
      lastError = new Error("API 응답을 읽을 수 없습니다. 프론트가 백엔드가 아닌 페이지 응답을 받았습니다.");
      continue;
    }

    if (!response.ok) {
      throw new Error(cleanDisplayText(payload.message, "요청 처리에 실패했습니다."));
    }

    return payload.data as T;
  }

  throw lastError;
}

function getFriendlyError(error: unknown) {
  return error instanceof Error ? cleanDisplayText(error.message, "요청 처리 중 오류가 발생했습니다.") : "요청 처리 중 오류가 발생했습니다.";
}

function getLoginErrorMessage(error: unknown) {
  const message = getFriendlyError(error);
  if (message.includes("없는 계정") || message.includes("not found")) {
    return "없는 계정입니다.";
  }
  if (message.includes("Invalid username or password") || message.includes("password") || message.includes("비밀번호")) {
    return "아이디 또는 비밀번호가 잘못 입력되었습니다.";
  }
  return message;
}

function isStrongPassword(password: string) {
  return password.length >= 8 && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
}

function isValidEmailAddress(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getActiveAuthToken(currentToken: string | null) {
  return currentToken || localStorage.getItem("creator-universe-token");
}

function AuthModal({
  mode,
  onClose,
  onAuth,
}: {
  mode: "login" | "signup" | "recovery";
  onClose: () => void;
  onAuth: (user: User, token: string) => void;
}) {
  const [view, setView] = useState(mode);
  const [recoveryMode, setRecoveryMode] = useState<"find-id" | "reset-password">("find-id");
  const [message, setMessage] = useState("");
  const [checkedUsername, setCheckedUsername] = useState("");
  const [checkedNickname, setCheckedNickname] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage("");
    try {
      const result = await request<{ user: User; token: string }>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({
          username: data.get("username"),
          password: data.get("password"),
        }),
      });
      onAuth(result.user, result.token);
      onClose();
    } catch (error) {
      setMessage(getLoginErrorMessage(error));
    }
  }

  async function submitSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const displayName = String(data.get("displayName") || "").trim();
    const username = String(data.get("username") || "").trim();
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (!isValidEmailAddress(email)) {
      setMessage("이메일은 example@email.com 형식으로 입력해 주세요.");
      return;
    }
    if (data.get("password") !== data.get("passwordConfirm")) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!isStrongPassword(password)) {
      setMessage("비밀번호는 8자 이상이며 특수문자를 1개 이상 포함해야 합니다.");
      return;
    }
    if (checkedNickname !== displayName) {
      setMessage("닉네임 중복확인을 먼저 완료해 주세요.");
      return;
    }
    if (checkedUsername !== username) {
      setMessage("아이디 중복확인을 먼저 완료해 주세요.");
      return;
    }

    setMessage("");
    try {
      const result = await request<{ user: User; token: string }>("/api/auth/signup", null, {
        method: "POST",
        body: JSON.stringify({
          displayName,
          email,
          username,
          password,
        }),
      });
      onAuth(result.user, result.token);
      onClose();
    } catch (error) {
      setMessage(`회원가입 실패: ${getFriendlyError(error)}`);
    }
  }

  async function submitFindId(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    if (!isValidEmailAddress(email)) {
      setMessage("이메일은 example@email.com 형식으로 입력해 주세요.");
      return;
    }
    setMessage("");
    try {
      const result = await request<{ username: string; displayName: string }>("/api/auth/find-id", null, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(`${result.displayName}님의 아이디는 ${result.username} 입니다.`);
    } catch (error) {
      setMessage(`아이디 찾기 실패: ${getFriendlyError(error)}`);
    }
  }

  async function submitResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const newPassword = String(data.get("newPassword") || "");
    if (!isValidEmailAddress(email)) {
      setMessage("이메일은 example@email.com 형식으로 입력해 주세요.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setMessage("새 비밀번호는 8자 이상이며 특수문자를 1개 이상 포함해야 합니다.");
      return;
    }
    setMessage("");
    try {
      await request("/api/auth/reset-password", null, {
        method: "POST",
        body: JSON.stringify({
          username: data.get("username"),
          email,
          newPassword,
        }),
      });
      setMessage("비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.");
      setView("login");
    } catch (error) {
      setMessage(`비밀번호 재설정 실패: ${getFriendlyError(error)}`);
    }
  }

  async function checkAuthValue(type: "nickname" | "username", form: HTMLFormElement | null) {
    if (!form) {
      return;
    }
    const data = new FormData(form);
    const value = String(data.get(type === "nickname" ? "displayName" : "username") || "").trim();
    if (!value) {
      setMessage(type === "nickname" ? "닉네임을 먼저 입력해 주세요." : "아이디를 먼저 입력해 주세요.");
      return;
    }

    setIsCheckingAuth(true);
    setMessage("");
    try {
      const result = await request<{ available: boolean; value: string }>(
        type === "nickname" ? "/api/auth/check-nickname" : "/api/auth/check-username",
        null,
        {
          method: "POST",
          body: JSON.stringify(type === "nickname" ? { displayName: value } : { username: value }),
        },
      );
      if (!result.available) {
        if (type === "nickname") {
          setCheckedNickname("");
        } else {
          setCheckedUsername("");
        }
        setMessage(type === "nickname" ? "이미 사용 중인 닉네임입니다." : "이미 사용 중인 아이디입니다.");
        return;
      }
      if (type === "nickname") {
        setCheckedNickname(result.value);
      } else {
        setCheckedUsername(result.value);
      }
      setMessage(type === "nickname" ? "사용 가능한 닉네임입니다." : "사용 가능한 아이디입니다.");
    } catch (error) {
      setMessage(`중복확인 실패: ${getFriendlyError(error)}`);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="auth-modal">
        <div className="modal-header">
          <div>
            <p className="kicker">Account</p>
            <h2>{view === "login" ? "로그인" : view === "signup" ? "회원가입" : "계정 찾기"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="segmented">
          <button className={view === "login" ? "active" : ""} onClick={() => setView("login")}>
            로그인
          </button>
          <button className={view === "signup" ? "active" : ""} onClick={() => setView("signup")}>
            회원가입
          </button>
          <button className={view === "recovery" ? "active" : ""} onClick={() => setView("recovery")}>
            계정 찾기
          </button>
        </div>

        {message && <div className="notice">{message}</div>}

        {view === "login" && (
          <form className="auth-form" onSubmit={submitLogin}>
            <label>아이디<input name="username" required placeholder="가입한 아이디" /></label>
            <label>비밀번호<input name="password" required type="password" placeholder="비밀번호" /></label>
            <button className="primary-button" type="submit"><LogIn size={18} /> 로그인</button>
          </form>
        )}

        {view === "signup" && (
          <form className="auth-form" onSubmit={submitSignup}>
            <label>
              닉네임
              <div className="auth-inline-field">
                <input
                  name="displayName"
                  required
                  onChange={() => setCheckedNickname("")}
                  placeholder="서비스에서 사용할 닉네임"
                />
                <button type="button" onClick={(event) => void checkAuthValue("nickname", event.currentTarget.form)} disabled={isCheckingAuth}>
                  중복확인
                </button>
              </div>
            </label>
            <label>이메일<input name="email" type="email" required /></label>
            <label>
              아이디
              <div className="auth-inline-field">
                <input
                  name="username"
                  required
                  minLength={2}
                  maxLength={24}
                  pattern="[A-Za-z0-9_]+"
                  onChange={() => setCheckedUsername("")}
                  placeholder="영문, 숫자, 밑줄만 가능"
                />
                <button type="button" onClick={(event) => void checkAuthValue("username", event.currentTarget.form)} disabled={isCheckingAuth}>
                  중복확인
                </button>
              </div>
            </label>
            <label>
              비밀번호
              <input name="password" type="password" minLength={8} required placeholder="8자 이상, 특수문자 1개 이상" />
              <small className="auth-help">예: universe!2026 처럼 특수문자를 포함해 주세요.</small>
            </label>
            <label>비밀번호 확인<input name="passwordConfirm" type="password" minLength={8} required /></label>
            <button className="primary-button" type="submit"><UserPlus size={18} /> 회원가입</button>
          </form>
        )}

        {view === "recovery" && (
          <>
            <div className="segmented small">
              <button className={recoveryMode === "find-id" ? "active" : ""} onClick={() => setRecoveryMode("find-id")}>
                아이디 찾기
              </button>
              <button className={recoveryMode === "reset-password" ? "active" : ""} onClick={() => setRecoveryMode("reset-password")}>
                비밀번호 찾기
              </button>
            </div>
            {recoveryMode === "find-id" ? (
              <form className="auth-form" onSubmit={submitFindId}>
                <label>가입 이메일<input name="email" type="email" required /></label>
                <button className="primary-button" type="submit"><Search size={18} /> 아이디 찾기</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={submitResetPassword}>
                <label>아이디<input name="username" required /></label>
                <label>가입 이메일<input name="email" type="email" required /></label>
                <label>
                  새 비밀번호
                  <input name="newPassword" type="password" minLength={8} required placeholder="8자 이상, 특수문자 1개 이상" />
                  <small className="auth-help">새 비밀번호에도 특수문자를 1개 이상 포함해야 합니다.</small>
                </label>
                <button className="primary-button" type="submit"><RefreshCw size={18} /> 비밀번호 재설정</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PaymentModal({
  mode,
  project,
  work,
  wallet,
  onClose,
  onConfirm,
  onLogin,
  onSwitchToCharge,
  isLoggedIn,
}: {
  mode: "charge" | "content";
  project: Project | null;
  work: ReaderWork | null;
  wallet: number | null;
  onClose: () => void;
  onConfirm: (payload: { mode: "charge" | "content"; coinAmount: number; paymentAmountKrw?: number }) => Promise<void>;
  onLogin: () => void;
  onSwitchToCharge: () => void;
  isLoggedIn: boolean;
}) {
  const [selectedProductId, setSelectedProductId] = useState("coin-1000");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const selectedProduct = coinProducts.find((item) => item.id === selectedProductId) || coinProducts[0];
  const isChargeMode = mode === "charge";
  const contentPrice = work?.priceCoins || project?.priceCoins || 1000;
  const feeRate = project?.appliedFeeRate ?? 0.15;
  const estimatedCreatorShare = Math.floor(contentPrice * (1 - feeRate));
  const hasEnoughCoins = wallet !== null && wallet >= contentPrice;
  const finalPaymentLabel = isChargeMode ? formatWon(selectedProduct.priceKrw) : formatCoins(contentPrice);
  const currentWallet = wallet ?? 0;
  const expectedWalletAfterPayment = isChargeMode
    ? currentWallet + selectedProduct.coins
    : Math.max(0, currentWallet - contentPrice);

  async function submitPayment() {
    setPaymentMessage("");
    if (!isLoggedIn) {
      onLogin();
      return;
    }

    if (!isChargeMode && !hasEnoughCoins) {
      onSwitchToCharge();
      return;
    }

    setIsPaying(true);
    try {
      await onConfirm({
        mode,
        coinAmount: isChargeMode ? selectedProduct.coins : contentPrice,
        paymentAmountKrw: isChargeMode ? selectedProduct.priceKrw : undefined,
      });
      onClose();
    } catch (error) {
      setPaymentMessage(getFriendlyError(error));
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="modal-backdrop payment-backdrop" role="dialog" aria-modal="true">
      <div className="payment-modal">
        <div className="modal-header">
          <div>
            <p className="kicker">Coin Checkout</p>
            <h2>{isChargeMode ? "코인 충전" : "콘텐츠 결제"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="결제창 닫기">
            <X size={19} />
          </button>
        </div>

        <div className="payment-hero">
          <div>
            <span className="payment-label">{isChargeMode ? "Wallet Top-up" : "콘텐츠 열람권"}</span>
            <strong>{isChargeMode ? "필요한 만큼 코인을 충전하세요" : work?.title || project?.title || "미드나잇 시그널"}</strong>
            <p>{isChargeMode ? "충전한 코인은 작품 열람, 후원, 창작자 구독에 사용할 수 있습니다." : work?.tagline || project?.synopsis || "작품 정보를 불러오는 중입니다."}</p>
          </div>
          <div className="coin-orb">
            <Coins size={34} />
            <b>{isChargeMode ? formatCoins(selectedProduct.coins) : formatCoins(contentPrice)}</b>
          </div>
        </div>

        {isChargeMode ? (
          <div className="coin-products" aria-label="코인 상품 선택">
            {coinProducts.map((item) => (
              <button
                key={item.id}
                className={selectedProductId === item.id ? "active" : ""}
                onClick={() => setSelectedProductId(item.id)}
                type="button"
              >
                <span>{item.badge}</span>
                <strong>{item.title}</strong>
                <b>{formatCoins(item.coins)}</b>
                <small>{formatWon(item.priceKrw)}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="payment-content-ticket">
            <span>열람권 구매</span>
            <strong>{formatCoins(contentPrice)}</strong>
            <p>{hasEnoughCoins ? "보유 코인에서 차감됩니다." : `현재 지갑에 ${formatCoins(wallet ?? 0)}만 있어 충전이 필요합니다.`}</p>
          </div>
        )}

        <div className="payment-grid">
          <div className="payment-method-card">
            <CreditCard size={20} />
            <div>
              <strong>간편 코인 결제</strong>
              <p>{isChargeMode ? "선택한 금액만큼 코인이 지갑에 충전됩니다." : "보유 코인으로 작품 열람권을 구매합니다."}</p>
            </div>
            <CheckCircle2 size={20} />
          </div>
          <div className="payment-method-card">
            <ShieldCheck size={20} />
            <div>
              <strong>{isChargeMode ? "충전 후 바로 사용" : "스마트 자동 정산"}</strong>
              <p>{isChargeMode ? "충전 내역은 지갑 원장에 +금액으로 기록됩니다." : `결제 후 수수료 ${Math.round(feeRate * 100)}%를 제외한 ${formatCoins(estimatedCreatorShare)}이 팀 지분율대로 분배됩니다.`}</p>
            </div>
          </div>
        </div>

        <div className="payment-summary">
          <div><span>선택 상품</span><b>{isChargeMode ? selectedProduct.title : work?.title || project?.title}</b></div>
          <div><span>내 지갑</span><b>{isLoggedIn ? formatCoins(currentWallet) : "로그인 필요"}</b></div>
          <div><span>{isChargeMode ? "충전 코인" : "사용 코인"}</span><b>{isChargeMode ? formatCoins(selectedProduct.coins) : formatCoins(contentPrice)}</b></div>
          <div><span>결제 금액</span><b>{isChargeMode ? formatWon(selectedProduct.priceKrw) : formatCoins(contentPrice)}</b></div>
          <div className="total"><span>최종 결제</span><b>{finalPaymentLabel}</b></div>
        </div>

        {paymentMessage && <p className="payment-error-message">{paymentMessage}</p>}

        {isLoggedIn && (
          <div className="payment-balance-preview">
            <div>
              <span>현재 보유</span>
              <strong>{formatCoins(currentWallet)}</strong>
            </div>
            <i>{isChargeMode ? "+" : "-"}</i>
            <div>
              <span>{isChargeMode ? "충전 후 보유" : "결제 후 보유"}</span>
              <strong>{formatCoins(expectedWalletAfterPayment)}</strong>
            </div>
          </div>
        )}

        <button className="primary-button payment-submit" onClick={submitPayment} disabled={isPaying}>
          {isLoggedIn ? <Wallet size={18} /> : <LogIn size={18} />}
          {isLoggedIn
            ? isPaying
              ? "결제 처리 중"
              : isChargeMode
                ? `${formatWon(selectedProduct.priceKrw)} 결제하기`
                : hasEnoughCoins
                  ? `${formatCoins(contentPrice)}으로 열람하기`
                  : "코인이 부족해요 · 충전하기"
            : "로그인하고 결제하기"}
        </button>
      </div>
    </div>
  );
}

function MatchProposalModal({
  creator,
  project,
  share,
  message,
  isSubmitting,
  onShareChange,
  onMessageChange,
  onClose,
  onSubmit,
}: {
  creator: Creator;
  project: Project | null;
  share: number;
  message: string;
  isSubmitting: boolean;
  onShareChange: (value: number) => void;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const projectTitle = project?.title || "Creator Universe Pilot";
  const currentRole = roleLabels[creator.primaryRole] || creator.primaryRole;

  return (
    <div className="modal-backdrop match-proposal-backdrop" role="dialog" aria-modal="true">
      <div className="match-proposal-modal">
        <div className="modal-header">
          <div>
            <p className="kicker">Collaboration Offer</p>
            <h2>수익 지분을 제안하고 매칭 보내기</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="매칭 제안 닫기">
            <X size={19} />
          </button>
        </div>

        <section className="match-proposal-hero">
          <div className="match-proposal-avatar">{creator.displayName.slice(0, 1)}</div>
          <div>
            <span>{currentRole} · @{creator.username}</span>
            <strong>{creator.displayName}</strong>
            <p>{creator.headline}</p>
          </div>
        </section>

        <section className="match-proposal-editor">
          <div className="proposal-project-card">
            <span>제안 프로젝트</span>
            <strong>{projectTitle}</strong>
            <p>{matchingContentFilters.filter((item) => item !== "전체").slice(0, 3).join(" · ")} 협업 제안으로 전달됩니다.</p>
          </div>

          <label className="share-proposal-control">
            <span>제안 수익 지분</span>
            <strong>{share}%</strong>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={share}
              onChange={(event) => onShareChange(Number(event.target.value))}
            />
          </label>

          <div className="proposal-split-preview">
            <div>
              <span>{creator.displayName}</span>
              <b>{share}%</b>
            </div>
            <div>
              <span>기존 팀원 자동 보정</span>
              <b>{100 - share}%</b>
            </div>
          </div>

          <label className="proposal-message-box">
            <span>채팅으로 함께 보낼 제안 메시지</span>
            <textarea
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder="예: 미스터리 웹툰 파일럿의 성우/사운드 파트를 맡아주셨으면 합니다. 수익 지분 25%로 제안드려요."
            />
          </label>
        </section>

        <button className="primary-button match-proposal-submit" onClick={onSubmit} disabled={isSubmitting}>
          <Send size={18} />
          {isSubmitting ? "제안 전송 중" : "채팅으로 매칭 제안 보내기"}
        </button>
      </div>
    </div>
  );
}

function MatchProposalBubble({
  proposal,
  canAccept,
  onAccept,
}: {
  proposal: MatchProposalPayload;
  canAccept: boolean;
  onAccept: () => void;
}) {
  const roleLabel = roleLabels[proposal.memberRole] || proposal.memberRole;

  return (
    <div className={`match-proposal-bubble ${proposal.status.toLowerCase()}`}>
      <strong>{proposal.projectTitle}</strong>
      <p>{proposal.message}</p>
      <div>
        <b>{roleLabel}</b>
        <b>{proposal.sharePercentage}%</b>
        <b>{proposal.projectType}</b>
      </div>
      {proposal.status === "ACCEPTED" ? (
        <em>수락 완료 · 팀원으로 합류됨</em>
      ) : canAccept ? (
        <button type="button" onClick={onAccept}>
          <CheckCircle2 size={16} /> 조건 보고 수락하기
        </button>
      ) : (
        <em>상대방 수락 대기 중</em>
      )}
    </div>
  );
}

function CreatorDetailModal({
  creator,
  token,
  onClose,
  onLoginRequired,
  onActionComplete,
}: {
  creator: Creator;
  token: string | null;
  onClose: () => void;
  onLoginRequired: () => void;
  onActionComplete: (message: string) => Promise<void>;
}) {
  const portfolio = getCreatorPortfolio(creator);
  const creatorWorks = readerWorks.filter((work) => work.participantUserIds.includes(creator.userId));
  const creatorPosts = creatorFanPosts.filter((post) => post.creatorUserId === creator.userId);
  const [profileTab, setProfileTab] = useState<"portfolio" | "fanclub" | "works">("portfolio");
  const [donationAmount, setDonationAmount] = useState(1000);
  const [donationMessage, setDonationMessage] = useState("");
  const [creatorActionMessage, setCreatorActionMessage] = useState("");
  const [isCreatorActionPending, setIsCreatorActionPending] = useState(false);

  async function runCreatorAction(action: () => Promise<void>) {
    if (!token) {
      onLoginRequired();
      return;
    }
    setIsCreatorActionPending(true);
    setCreatorActionMessage("");
    try {
      await action();
    } catch (error) {
      setCreatorActionMessage(error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsCreatorActionPending(false);
    }
  }

  function submitDonation() {
    void runCreatorAction(async () => {
      await request(`/api/creators/${creator.userId}/donations`, token, {
        method: "POST",
        body: JSON.stringify({ amount: donationAmount, message: donationMessage }),
      });
      setCreatorActionMessage(`${creator.displayName}님에게 ${formatCoins(donationAmount)} 후원을 보냈습니다.`);
      await onActionComplete("후원이 완료되었습니다. 지갑 내역을 갱신했습니다.");
    });
  }

  function submitSubscription(plan: (typeof creatorMembershipPlans)[number]) {
    void runCreatorAction(async () => {
      await request(`/api/creators/${creator.userId}/subscriptions`, token, {
        method: "POST",
        body: JSON.stringify({ tierName: plan.name, priceCoins: plan.price }),
      });
      setCreatorActionMessage(`${plan.name} 구독이 시작되었습니다.`);
      await onActionComplete("창작자 구독이 완료되었습니다.");
    });
  }

  function unlockFanPost(post: (typeof creatorFanPosts)[number]) {
    void runCreatorAction(async () => {
      await request(`/api/fan-posts/${post.id}/unlock`, token, {
        method: "POST",
        body: JSON.stringify({ priceCoins: post.priceCoins }),
      });
      setCreatorActionMessage(`${post.title} 열람권이 열렸습니다.`);
      await onActionComplete("유료 포스트 열람권이 발급되었습니다.");
    });
  }

  function reportCreator() {
    void runCreatorAction(async () => {
      await request("/api/reports", token, {
        method: "POST",
        body: JSON.stringify({
          targetUserId: creator.userId,
          reason: `${creator.displayName} 사용자 응대 신고`,
          context: "창작자 프로필에서 접수된 사용자 신고입니다.",
        }),
      });
      setCreatorActionMessage("신고가 접수되었습니다. 운영팀이 확인합니다.");
      await onActionComplete("신고가 접수되었습니다.");
    });
  }

  return (
    <div className="modal-backdrop creator-detail-backdrop" role="dialog" aria-modal="true">
      <div className="creator-detail-modal">
        <div className="creator-detail-hero">
          <div className={`creator-detail-art ${creator.primaryRole.toLowerCase()}`}>
            <span>{roleLabels[creator.primaryRole]}</span>
            <strong>{creator.displayName}</strong>
            <p>@{creator.username}</p>
          </div>
          <div className="creator-detail-copy">
            <div className="modal-header">
              <div>
                <p className="kicker">Creator Portfolio</p>
                <h2>{creator.displayName} 포트폴리오</h2>
              </div>
              <button className="icon-button" onClick={onClose} aria-label="포트폴리오 닫기">
                <X size={19} />
              </button>
            </div>
            <p className="detail-headline">{creator.headline}</p>
            <p>{creator.portfolioSummary || creator.bio}</p>
            <div className="detail-stats">
              <div><strong>{creator.responseRate}%</strong><span>응답률</span></div>
              <div><strong>{creator.completedProjects}</strong><span>완료 프로젝트</span></div>
              <div><strong>{creator.followerCount.toLocaleString("ko-KR")}</strong><span>팔로워</span></div>
            </div>
          </div>
        </div>

        {creator.voiceDemo && (
          <div className="detail-audio">
            <button aria-label="보이스 샘플 재생"><Play size={18} /></button>
            <div>
              <strong>{creator.voiceDemo.title}</strong>
              <div className="wave-player compact-wave">
                <div>{creator.voiceDemo.waveform.map((height, index) => <i key={index} style={{ height }} />)}</div>
              </div>
            </div>
            <span>{formatDuration(creator.voiceDemo.durationSeconds)}</span>
          </div>
        )}

        <div className="creator-profile-tabs" aria-label="창작자 프로필 탭">
          <button className={profileTab === "portfolio" ? "active" : ""} onClick={() => setProfileTab("portfolio")}>포트폴리오</button>
          <button className={profileTab === "fanclub" ? "active" : ""} onClick={() => setProfileTab("fanclub")}>팬클럽/유료 포스트</button>
          <button className={profileTab === "works" ? "active" : ""} onClick={() => setProfileTab("works")}>참여 작품</button>
        </div>

        {profileTab === "portfolio" && (
          <div className="portfolio-list">
            {portfolio.map((item) => (
              <article key={item.title} className="portfolio-item">
                <span>{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="chips">{item.tags.map((tag) => <em key={tag}>{tag}</em>)}</div>
              </article>
            ))}
          </div>
        )}

        {profileTab === "fanclub" && (
          <>
            <section className="creator-support-panel">
              <div>
                <p className="kicker">Creator Fan Club</p>
                <h3>{creator.displayName} 후원/구독</h3>
                <p>픽시브 FANBOX나 Patreon처럼 창작자가 러프, 짧은 이미지팩, 보이스, 제작노트를 올리고 팬이 코인 또는 월 구독으로 열람하는 공간입니다.</p>
              </div>
              <div className="support-actions support-donation-box">
                <label>
                  <span>후원 코인 직접 입력</span>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={donationAmount}
                    onChange={(event) => setDonationAmount(Number(event.target.value))}
                  />
                </label>
                <textarea
                  value={donationMessage}
                  onChange={(event) => setDonationMessage(event.target.value)}
                  placeholder="창작자에게 보낼 응원 메시지"
                />
                <button onClick={submitDonation} disabled={isCreatorActionPending}><Coins size={17} /> 원하는 코인으로 후원</button>
                <button className="report-creator-button" onClick={reportCreator} disabled={isCreatorActionPending}>불친절/문제 사용자 신고</button>
              </div>
            </section>
            {creatorActionMessage && <p className="creator-action-message">{creatorActionMessage}</p>}

            <section className="membership-tier-grid">
              {creatorMembershipPlans.map((plan) => (
                <article key={plan.name}>
                  <span>{plan.name}</span>
                  <strong>{formatCoins(plan.price)} / 월</strong>
                  {plan.benefits.map((benefit) => <p key={benefit}>{benefit}</p>)}
                  <button onClick={() => submitSubscription(plan)} disabled={isCreatorActionPending}>이 티어 구독</button>
                </article>
              ))}
            </section>

            <section className="creator-paid-feed">
              <div className="section-head compact-head">
                <div>
                  <p className="kicker">Fan Posts</p>
                  <h3>창작자 전용 포스트</h3>
                </div>
              </div>
              <div>
                {creatorPosts.length > 0 ? creatorPosts.map((post) => (
                  <article className={post.tone} key={post.id}>
                    <div className="paid-post-preview">
                      <span>{post.type}</span>
                    </div>
                    <div>
                      <span>{post.access}</span>
                      <strong>{post.title}</strong>
                      <p>{post.description}</p>
                      <button onClick={() => unlockFanPost(post)} disabled={isCreatorActionPending}>{post.priceCoins > 0 ? `${formatCoins(post.priceCoins)} 열람` : "무료 보기"}</button>
                    </div>
                  </article>
                )) : (
                  <div className="empty-matching">
                    <Sparkles size={24} />
                    <strong>아직 공개된 팬 포스트가 없어요</strong>
                    <p>이 창작자가 새 포스트를 올리면 구독자에게 먼저 알림이 갑니다.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {profileTab === "works" && creatorWorks.length > 0 && (
          <section className="creator-related-works">
            <div className="section-head compact-head">
              <div>
                <p className="kicker">Participated Works</p>
                <h3>참여 작품</h3>
              </div>
            </div>
            <div>
              {creatorWorks.map((work) => (
                <article key={work.id}>
                  <img src={work.coverImage} alt="" />
                  <div>
                    <span>{work.format} · {work.genre}</span>
                    <strong>{work.title}</strong>
                    <p>{work.tagline}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function WorkDetailModal({
  work,
  rank,
  reviews,
  creators,
  isPurchased,
  reviewRating,
  reviewBody,
  onClose,
  onOpenCreator,
  onOpenPayment,
  onRatingChange,
  onReviewBodyChange,
  onSubmitReview,
}: {
  work: ReaderWork;
  rank: number;
  reviews: ContentReview[];
  creators: Creator[];
  isPurchased: boolean;
  reviewRating: number;
  reviewBody: string;
  onClose: () => void;
  onOpenCreator: (creator: Creator) => void;
  onOpenPayment: () => void;
  onRatingChange: (rating: number) => void;
  onReviewBodyChange: (body: string) => void;
  onSubmitReview: () => void;
}) {
  const participants = work.participantUserIds
    .map((userId) => creators.find((creator) => creator.userId === userId))
    .filter(Boolean) as Creator[];
  const audioAvailable = hasAudioExperience(work);
  const audioLabel = getAudioExperienceLabel(work);
  const episodes = getWorkEpisodes(work);

  return (
    <div className="modal-backdrop work-detail-backdrop" role="dialog" aria-modal="true">
      <div className="work-detail-modal">
        <div className={`work-detail-hero ${work.tone}`}>
          <img src={work.coverImage} alt={`${work.title} 커버`} />
          <div>
            <div className="modal-header">
              <div>
                <p className="kicker">Work Detail</p>
                <h2>{work.title}</h2>
              </div>
              <button className="icon-button" onClick={onClose} aria-label="작품 상세 닫기">
                <X size={19} />
              </button>
            </div>
            <span className="work-rank-badge"><Flame size={16} /> 전체 #{rank} · {work.genre} 인기작</span>
            <p>{work.tagline}</p>
            <div className="work-detail-meta">
              <b>{work.format}</b>
              <b>{work.subGenre}</b>
              <b><Star size={15} /> {work.rating}</b>
              <b>{work.listeners} 감상</b>
              <b>{work.episodes}화</b>
            </div>
            <div className="reader-actions">
              {isPurchased ? (
                <button className="ghost-button compact purchased-badge"><CheckCircle2 size={16} /> 열람권 보유</button>
              ) : (
                <button className="primary-button compact" onClick={onOpenPayment}><Coins size={16} /> {formatCoins(work.priceCoins)} 구매</button>
              )}
            </div>
          </div>
        </div>

        <section className="work-notice-panel">
          <div>
            <span>작품 공지</span>
            <strong>{work.format} 연재 안내</strong>
            <p>
              1화는 무료로 공개됩니다. 구매 후에는 모든 유료 회차와 참여 창작자 크레딧, 리뷰 작성 기능을 같은 상세 화면에서 이용할 수 있어요.
            </p>
          </div>
          <div>
            <span>열람 상태</span>
            <strong>{isPurchased ? "전체 열람 가능" : "1화 무료 · 유료 회차 잠금"}</strong>
            <p>{isPurchased ? "이미 구매한 작품입니다. 회차 목록에서 바로 감상하세요." : "마음에 들면 열람권을 구매해 이어볼 수 있습니다."}</p>
          </div>
        </section>

        {audioAvailable && (
          <section className="work-audio-panel">
            <div className="work-audio-copy">
              <p className="kicker">Audio Experience</p>
              <h3>{audioLabel}으로 작품을 먼저 체험하세요</h3>
              <p>
                구매 전에는 30초 샘플을 제공하고, 구매 후에는 에피소드 전체 감상과 고대비 대본 미리보기를 같은 상세 화면에서 이어볼 수 있게 설계했습니다.
              </p>
              <div className="audio-feature-tags">
                <span><Headphones size={14} /> 30초 샘플</span>
                <span><CheckCircle2 size={14} /> 대본 동기화</span>
                <span><Globe2 size={14} /> 접근성 모드</span>
              </div>
            </div>
            <div className="audio-player-card">
              <div className="audio-player-head">
                <button aria-label="오디오 샘플 재생"><Play size={18} /></button>
                <div>
                  <strong>{isPurchased ? "전체 에피소드 감상 가능" : "무료 샘플 00:30"}</strong>
                  <span>{work.title} · {audioLabel}</span>
                </div>
              </div>
              <div className="audio-waveform" aria-hidden="true">
                {audioWaveBars.map((height, index) => <i key={index} style={{ height }} />)}
              </div>
              <div className="audio-progress-line"><span style={{ width: isPurchased ? "64%" : "28%" }} /></div>
              <div className="audio-transcript-card">
                <span>대본 미리보기</span>
                <p>“이 장면의 목소리는 낮게 시작해, 도시의 소음 위로 천천히 떠오릅니다.”</p>
              </div>
            </div>
          </section>
        )}

        <section className="work-detail-section episode-section">
          <div className="section-head compact-head">
            <div>
              <p className="kicker">Episode List</p>
              <h3>회차 목록</h3>
            </div>
            <p>무료 회차와 구매 후 열리는 회차를 구분해서 보여줍니다.</p>
          </div>
          <div className="episode-list">
            {episodes.map((episode) => {
              const unlocked = episode.isFree || isPurchased;
              return (
                <article className={unlocked ? "unlocked" : "locked"} key={episode.id}>
                  <div className="episode-number">
                    <span>{episode.episodeNumber}</span>
                    <small>{episode.isFree ? "FREE" : unlocked ? "OPEN" : "LOCK"}</small>
                  </div>
                  <div>
                    <strong>{episode.title}</strong>
                    <p>{episode.summary}</p>
                    <div className="episode-meta">
                      <span>{episode.publishedAt}</span>
                      <span>{episode.readingTime}</span>
                      <span>{episode.isFree ? "무료" : formatCoins(episode.priceCoins)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={unlocked ? undefined : onOpenPayment}>
                    {unlocked ? <Play size={16} /> : <Coins size={16} />}
                    {unlocked ? "감상하기" : "구매 필요"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="work-detail-section">
          <div className="section-head compact-head">
            <div>
              <p className="kicker">Production Team</p>
              <h3>이 작품에 참여한 창작자</h3>
            </div>
          </div>
          <div className="work-detail-creators">
            {participants.map((creator) => (
              <button key={creator.id} onClick={() => onOpenCreator(creator)}>
                <i>{creator.displayName.slice(0, 1)}</i>
                <span>{roleLabels[creator.primaryRole]}</span>
                <strong>{creator.displayName}</strong>
                <small>{creator.headline}</small>
              </button>
            ))}
          </div>
          <div className="production-credit-strip">
            <article><span>기획/원작</span><strong>{participants.find((creator) => creator.primaryRole === "WRITER")?.displayName ?? "창작팀"}</strong></article>
            <article><span>비주얼</span><strong>{participants.find((creator) => creator.primaryRole === "ILLUSTRATOR")?.displayName ?? "아트팀"}</strong></article>
            <article><span>보이스/BGM</span><strong>{participants.find((creator) => ["VOICE_ACTOR", "SOUND_DIRECTOR"].includes(creator.primaryRole))?.displayName ?? "사운드팀"}</strong></article>
          </div>
        </section>

        <section className="work-detail-section">
          <div className="section-head compact-head">
            <div>
              <p className="kicker">Comments & Reviews</p>
              <h3>작품 댓글/리뷰</h3>
            </div>
            <p>작품 상세 안에서만 리뷰가 보이도록 분리했습니다.</p>
          </div>
          <div className="review-form work-review-form">
            <select value={reviewRating} onChange={(event) => onRatingChange(Number(event.target.value))} aria-label="리뷰 평점">
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}점</option>)}
            </select>
            <textarea value={reviewBody} onChange={(event) => onReviewBodyChange(event.target.value)} placeholder={`${work.title} 감상평이나 응원 댓글을 남겨보세요.`} />
            <button onClick={onSubmitReview}><Star size={17} /> 리뷰 등록</button>
          </div>
          <div className="review-list work-review-list">
            {reviews.length > 0 ? reviews.map((review) => (
              <div key={review.id}>
                <span>{"★".repeat(review.rating)} · {formatDateTime(review.createdAt)}</span>
                <strong>{review.authorName}</strong>
                <p>{review.body}</p>
              </div>
            )) : (
              <div>
                <span>첫 리뷰 대기 중</span>
                <strong>아직 등록된 댓글이 없어요</strong>
                <p>작품을 감상한 뒤 첫 응원 댓글을 남겨보세요.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const policySections: Array<{
  id: PolicyTabId;
  label: string;
  title: string;
  summary: string;
  items: string[];
  url: string;
}> = [
  {
    id: "privacy",
    label: "개인정보 처리방침",
    title: "개인정보 처리방침",
    summary: "크리에이터 유니버스는 창작자 매칭, 콘텐츠 열람, 코인 결제, 자동 정산, 고객지원 제공에 필요한 개인정보만 수집하고 안전하게 처리합니다.",
    items: [
      "수집 항목: 이메일, 아이디, 닉네임, 비밀번호 해시, 지갑/코인 거래, 콘텐츠 구매, 창작자 프로필, 문의/신고, 서비스 이용 로그",
      "이용 목적: 회원 인증, 콘텐츠 접근권 발급, 코인 충전/사용, 팀 정산, 매칭 제안, 고객지원, 부정 이용 방지, 접근성 품질 개선",
      "제3자 제공/공유: 결제 처리, 클라우드 인프라, 이메일/알림 발송 등 서비스 운영에 필요한 범위에서만 처리 위탁 또는 공유",
      "보관/삭제: 회원 탈퇴 또는 삭제 요청 시 지체 없이 삭제하되, 전자상거래·분쟁 대응 등 법령상 필요한 기록은 정해진 기간 보관",
      "문의: privacy@creator-universe.app 으로 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.",
    ],
    url: "/privacy-policy.html",
  },
  {
    id: "terms",
    label: "약관",
    title: "서비스 이용약관",
    summary: "회원은 크리에이터 유니버스에서 창작자 매칭, 콘텐츠 발행/열람, 코인 결제, 팬 구독, 자동 정산 기능을 약관에 따라 이용합니다.",
    items: [
      "회원은 타인의 저작권, 초상권, 음성권, 개인정보, 명예를 침해하지 않는 콘텐츠와 프로필만 등록해야 합니다.",
      "창작팀은 프로젝트별 지분율, 역할, 공개 범위, 수익 분배 조건을 사전에 합의하고 시스템에 등록해야 합니다.",
      "플랫폼 수수료는 일반 15%, 공식 파트너 8%로 고정 적용됩니다.",
      "부정 결제, 무단 복제, 계정 공유, 스팸성 매칭, 괴롭힘 등 서비스 신뢰를 해치는 행위는 제한될 수 있습니다.",
      "서비스는 MVP/베타 성격의 기능을 포함할 수 있으며, 정식 결제·정산 연동 전 일부 기능은 데모 데이터로 제공될 수 있습니다.",
    ],
    url: "/terms.html",
  },
  {
    id: "refund",
    label: "판매 및 환불",
    title: "판매 및 환불 정책",
    summary: "코인과 콘텐츠 열람권은 디지털 상품 특성을 고려해 사용 여부와 결제 상태에 따라 환불 기준을 다르게 적용합니다.",
    items: [
      "미사용 코인은 결제 수단별 승인 취소 가능 기간 내 환불 요청이 가능합니다.",
      "콘텐츠를 재생하거나 열람권을 사용한 경우 단순 변심 환불이 제한될 수 있습니다.",
      "중복 결제, 시스템 오류, 접근권 미지급은 확인 후 우선 환불 또는 재지급 처리합니다.",
      "환불 완료 시 해당 거래의 자동 정산분은 다음 고정 정산일에 차감 또는 보정됩니다.",
    ],
    url: "/refund-policy.html",
  },
  {
    id: "legal",
    label: "법적 고지",
    title: "법적 고지",
    summary: "크리에이터 유니버스의 브랜드, UI, 정산 구조, 소프트웨어, 콘텐츠 데이터와 창작자의 작품 권리는 보호 대상입니다.",
    items: [
      "게시된 작품, 대본, 이미지, 음성, BGM의 권리는 원 권리자와 창작팀에게 있습니다.",
      "플랫폼은 창작자 간 계약과 분쟁을 줄이기 위한 정산 기록과 거래 로그를 제공합니다.",
      "AI 번역, 로컬라이징, 접근성 기능은 보조 수단이며 최종 검수 책임은 창작팀에 있습니다.",
      "법령 또는 권리 침해 신고가 접수된 콘텐츠는 임시 비공개 처리될 수 있습니다.",
    ],
    url: "/legal-notice.html",
  },
  {
    id: "sitemap",
    label: "사이트 맵",
    title: "사이트 맵",
    summary: "서비스 소개부터 작품 탐색, 팀 매칭, 지갑, 정산, 고객센터까지 MVP 핵심 화면으로 이동할 수 있습니다.",
    items: [
      "홈: 플랫폼 소개, ESG 미션, 파트너 시스템, 로드맵",
      "작품: 장르별 추천 오디오 콘텐츠와 코인 결제",
      "매칭: 글, 그림, 목소리, BGM 창작자 포트폴리오 탐색",
      "지갑/정산/고객센터: 로그인 후 이용 가능한 결제 내역, 수익 분배, 문의/신고 화면",
    ],
    url: "/sitemap.html",
  },
];

function PolicyModal({ initialTab, onClose }: { initialTab: PolicyTabId; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<PolicyTabId>(initialTab);
  const currentPolicy = policySections.find((section) => section.id === activeTab) || policySections[0];

  return (
    <div className="modal-backdrop policy-backdrop" role="dialog" aria-modal="true">
      <div className="policy-modal">
        <div className="modal-header">
          <div>
            <p className="kicker">Creator Universe Policy</p>
            <h2>{currentPolicy.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="정책창 닫기">
            <X size={19} />
          </button>
        </div>

        <div className="policy-tabs">
          {policySections.map((section) => (
            <button
              key={section.id}
              className={activeTab === section.id ? "active" : ""}
              onClick={() => setActiveTab(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        <section className="policy-content">
          <span>대한민국 기준 정책 · Google Play 제출용 URL 제공</span>
          <h3>{currentPolicy.title}</h3>
          <p>{currentPolicy.summary}</p>
          <div>
            {currentPolicy.items.map((item) => (
              <article key={item}>
                <CheckCircle2 size={18} />
                <p>{item}</p>
              </article>
            ))}
          </div>
          <a className="policy-page-link" href={currentPolicy.url} target="_blank" rel="noreferrer">
            전체 {currentPolicy.label} 페이지 열기
          </a>
        </section>
      </div>
    </div>
  );
}

function AccountModal({
  user,
  wallet,
  purchasedWorkIds,
  scrappedWorkIds,
  recentWorkIds,
  premiumSubscription,
  notificationPreferences,
  onClose,
  onLogout,
  onDeleteAccount,
  onOpenPayment,
  onStartPremium,
  onCancelPremium,
  onToggleNotificationPreference,
  onNavigate,
  onOpenLibrary,
}: {
  user: User;
  wallet: number | null;
  purchasedWorkIds: string[];
  scrappedWorkIds: string[];
  recentWorkIds: string[];
  premiumSubscription: PremiumSubscriptionState;
  notificationPreferences: NotificationPreferences;
  onClose: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenPayment: () => void;
  onStartPremium: () => void;
  onCancelPremium: () => void;
  onToggleNotificationPreference: (key: keyof NotificationPreferences) => void;
  onNavigate: (page: PageId) => void;
  onOpenLibrary: (view: (typeof libraryViewItems)[number]["id"]) => void;
}) {
  const purchasedWorks = readerWorks.filter((work) => purchasedWorkIds.includes(work.id));
  const scrappedWorks = readerWorks.filter((work) => scrappedWorkIds.includes(work.id));
  const recentWorks = recentWorkIds
    .map((workId) => readerWorks.find((work) => work.id === workId))
    .filter(Boolean) as ReaderWork[];
  const walletBalance = wallet ?? 0;
  const walletUsageHint = walletBalance > 0
    ? `지금 바로 ${Math.min(walletBalance, 1000).toLocaleString("ko-KR")}코인 작품을 열람할 수 있어요.`
    : "첫 충전 후 작품 열람, 창작자 후원, 프리미엄 구독을 시작할 수 있어요.";
  const latestWalletWork = purchasedWorks[0] ?? recentWorks[0] ?? scrappedWorks[0];

  return (
    <div className="modal-backdrop account-backdrop" role="dialog" aria-modal="true">
      <div className="account-modal">
        <div className="modal-header">
          <div>
            <p className="kicker">My Universe</p>
            <h2>내 계정</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="계정창 닫기">
            <X size={19} />
          </button>
        </div>

        <section className="account-hero-card">
          <div className="account-avatar">{user.displayName.slice(0, 1)}</div>
          <div>
            <strong>{user.displayName}</strong>
            <span>@{user.username} · {user.email}</span>
          </div>
          <button className="ghost-button compact" onClick={onOpenPayment}><Coins size={16} /> 코인 충전</button>
        </section>

        <div className="account-grid">
          <section className="account-panel wallet-account-panel">
            <div className="account-panel-head">
              <Wallet size={20} />
              <strong>내 지갑</strong>
            </div>
            <div className="account-wallet">
              <div className="account-wallet-main">
                <div>
                  <span>보유 코인</span>
                  <b>{wallet === null ? "로그인 필요" : formatCoins(walletBalance)}</b>
                </div>
                <button type="button" onClick={onOpenPayment}><Coins size={15} /> 충전</button>
              </div>
              <div className="wallet-balance-meter" aria-hidden="true">
                <span style={{ width: `${Math.min(100, Math.max(8, walletBalance / 100))}%` }} />
              </div>
              <small>{walletUsageHint}</small>
            </div>
            <div className="wallet-mini-grid">
              <div><span>결제 작품</span><b>{purchasedWorks.length}</b></div>
              <div><span>스크랩</span><b>{scrappedWorks.length}</b></div>
              <div><span>이어보기</span><b>{recentWorks.length}</b></div>
            </div>
            <div className="wallet-account-feed">
              <article>
                <span>최근 활동</span>
                <strong>{latestWalletWork ? latestWalletWork.title : "아직 작품 활동이 없어요"}</strong>
              </article>
              <article>
                <span>사용 가능</span>
                <strong>작품 구매 · 후원 · 프리미엄 구독</strong>
              </article>
              <article>
                <span>정산 연결</span>
                <strong>창작팀 수익은 지갑으로 자동 입금</strong>
              </article>
            </div>
            <div className="account-quick-actions">
              <button onClick={() => { onClose(); onNavigate("wallet"); }}><Wallet size={15} /> 지갑 내역</button>
              <button onClick={() => { onClose(); onNavigate("settlement"); }}><Split size={15} /> 정산 보기</button>
            </div>
          </section>

          <section className="account-panel premium-account-panel">
            <div className="account-panel-head">
              <Sparkles size={20} />
              <strong>크리에이터 유니버스 프리미엄</strong>
            </div>
            <div className={`premium-status-pill ${premiumSubscription.isActive ? "active" : ""}`}>
              {premiumSubscription.isActive ? "구독중" : "미구독"}
            </div>
            <div className="premium-mini-price">
              <span>월 구독</span>
              <b>7,900 코인</b>
            </div>
            <div className="premium-billing-card">
              <span>{premiumSubscription.isActive ? "다음 재결제일" : "구독 시작 시"}</span>
              <strong>{premiumSubscription.isActive ? formatDateOnly(premiumSubscription.nextBillingDate) : "즉시 활성화"}</strong>
              <small>{premiumSubscription.isActive ? "재결제 전 언제든 해지할 수 있어요." : "광고 제거와 보너스 코인이 계정에 적용됩니다."}</small>
            </div>
            <div className="premium-benefit-strip" aria-label="프리미엄 핵심 혜택">
              <span><Coins size={14} /> 매월 1,000 보너스</span>
              <span><Bell size={14} /> 신작 우선 알림</span>
              <span><ShieldCheck size={14} /> 광고 없는 감상</span>
            </div>
            {universePremiumBenefits.slice(0, 3).map((benefit) => (
              <p key={benefit}><CheckCircle2 size={15} /> {benefit}</p>
            ))}
            {premiumSubscription.isActive ? (
              <button className="premium-cancel-button" onClick={onCancelPremium}>프리미엄 해지</button>
            ) : (
              <button onClick={onStartPremium}>프리미엄 구독 시작</button>
            )}
            <button className="premium-manage-button" onClick={onOpenPayment}>코인 충전/결제 관리</button>
          </section>

          <section className="account-panel">
            <div className="account-panel-head">
              <Settings size={20} />
              <strong>내 정보 변경</strong>
            </div>
            <label>닉네임<input defaultValue={user.displayName} /></label>
            <label>이메일<input defaultValue={user.email} /></label>
            <button>변경사항 저장</button>
          </section>

          <section className="account-panel account-summary-panel">
            <div className="account-panel-head">
              <UserRound size={20} />
              <strong>계정 요약</strong>
            </div>
            <p>내 활동을 빠르게 확인하고 바로 이동할 수 있는 개인 허브입니다.</p>
            <div className="account-summary-grid">
              <div><span>보관함</span><b>{purchasedWorks.length + scrappedWorks.length + recentWorks.length}</b></div>
              <div><span>알림</span><b>{notificationPreferences.newEpisode ? "ON" : "OFF"}</b></div>
              <div><span>프리미엄</span><b>{premiumSubscription.isActive ? "구독중" : "미구독"}</b></div>
            </div>
            <div className="account-summary-actions">
              <button onClick={() => { onClose(); onOpenLibrary("recent"); }}><RefreshCw size={15} /> 이어보기</button>
              <button onClick={() => { onClose(); onNavigate("support"); }}><ShieldCheck size={15} /> 도움센터</button>
            </div>
          </section>

          <section className="account-panel wide">
            <div className="account-panel-head">
              <BookOpen size={20} />
              <strong>내가 결제한 작품</strong>
            </div>
            <div className="purchase-list">
              {purchasedWorks.length > 0 ? purchasedWorks.map((work) => (
                <article key={work.id}>
                  <div>
                    <span>{work.genre}</span>
                    <strong>{work.title}</strong>
                    <p>{work.subGenre} · {work.episodes}화</p>
                  </div>
                  <button onClick={() => { onClose(); onOpenLibrary("purchased"); }}>작품 보기</button>
                </article>
              )) : (
                <article>
                  <div>
                    <span>아직 없음</span>
                    <strong>결제한 작품이 없어요</strong>
                    <p>작품 페이지에서 코인으로 열람권을 구매해보세요.</p>
                  </div>
                  <button onClick={() => { onClose(); onOpenLibrary("all"); }}>작품 찾기</button>
                </article>
              )}
            </div>
          </section>

          <section className="account-panel wide">
            <div className="account-panel-head">
              <Heart size={20} />
              <strong>스크랩한 작품</strong>
            </div>
            <div className="purchase-list">
              {scrappedWorks.length > 0 ? scrappedWorks.slice(0, 4).map((work) => (
                <article key={work.id}>
                  <div>
                    <span>{work.genre}</span>
                    <strong>{work.title}</strong>
                    <p>{work.subGenre} · {work.listeners} 감상</p>
                  </div>
                  <button onClick={() => { onClose(); onOpenLibrary("scrapped"); }}>보러가기</button>
                </article>
              )) : (
                <article>
                  <div>
                    <span>빈 보관함</span>
                    <strong>하트를 누르면 여기에 저장돼요</strong>
                    <p>나중에 볼 작품을 스크랩해두세요.</p>
                  </div>
                  <button onClick={() => { onClose(); onOpenLibrary("all"); }}>스크랩하러 가기</button>
                </article>
              )}
            </div>
          </section>

          <section className="account-panel wide recent-account-panel">
            <div className="account-panel-head">
              <RefreshCw size={20} />
              <strong>최근 본 작품</strong>
            </div>
            <div className="recent-account-summary">
              <div>
                <span>이어보기 큐</span>
                <b>{recentWorks.length}개</b>
              </div>
              <button onClick={() => { onClose(); onOpenLibrary("recent"); }}>최근 본 작품으로 이동</button>
            </div>
            <div className="purchase-list compact-purchase-list">
              {recentWorks.length > 0 ? recentWorks.slice(0, 3).map((work) => (
                <article key={work.id}>
                  <div>
                    <span>{work.format} · {work.genre}</span>
                    <strong>{work.title}</strong>
                    <p>{work.subGenre} · 마지막으로 열어본 작품</p>
                  </div>
                  <button onClick={() => { onClose(); onOpenLibrary("recent"); }}>이어보기</button>
                </article>
              )) : (
                <article>
                  <div>
                    <span>아직 없음</span>
                    <strong>작품 상세를 열면 여기에 쌓여요</strong>
                    <p>랭킹이나 추천작에서 상세/리뷰를 눌러 최근 본 작품을 만들어보세요.</p>
                  </div>
                  <button onClick={() => { onClose(); onOpenLibrary("all"); }}>작품 둘러보기</button>
                </article>
              )}
            </div>
          </section>

          <section className="account-panel">
            <div className="account-panel-head">
              <Bell size={20} />
              <strong>알림 설정</strong>
            </div>
            <p>스크랩하거나 최근 본 작품의 새 회차, 정산 완료, 이벤트 알림 수신 여부를 직접 설정합니다.</p>
            <label className="account-check">
              <input
                type="checkbox"
                checked={notificationPreferences.newEpisode}
                onChange={() => onToggleNotificationPreference("newEpisode")}
              />
              새 회차 알림
            </label>
            <label className="account-check">
              <input
                type="checkbox"
                checked={notificationPreferences.settlement}
                onChange={() => onToggleNotificationPreference("settlement")}
              />
              정산 완료 알림
            </label>
            <label className="account-check">
              <input
                type="checkbox"
                checked={notificationPreferences.marketing}
                onChange={() => onToggleNotificationPreference("marketing")}
              />
              광고/이벤트 알림
            </label>
          </section>

          <section className="account-panel danger">
            <div className="account-panel-head">
              <ShieldCheck size={20} />
              <strong>보안과 로그아웃</strong>
            </div>
            <p>공용 PC에서는 감상 후 로그아웃을 권장합니다. 탈퇴 시 로그인 정보는 삭제되고 정산/결제 원장은 익명 계정으로 보존됩니다.</p>
            <button onClick={onLogout}><LogOut size={16} /> 로그아웃</button>
            <button className="delete-account-button" onClick={onDeleteAccount}><ShieldCheck size={16} /> 계정 탈퇴</button>
          </section>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem("creator-universe-token"));
  const [user, setUser] = useState<User | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [role, setRole] = useState("ALL");
  const [matchingSearch, setMatchingSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("전체");
  const [matchingFilters, setMatchingFilters] = useState<string[]>([]);
  const [readerSearch, setReaderSearch] = useState("");
  const [readerFilters, setReaderFilters] = useState<string[]>([]);
  const [readerLibraryView, setReaderLibraryView] = useState<(typeof libraryViewItems)[number]["id"]>("all");
  const [purchasedWorkIds, setPurchasedWorkIds] = useState<string[]>([]);
  const [scrappedWorkIds, setScrappedWorkIds] = useState<string[]>([]);
  const [recentWorkIds, setRecentWorkIds] = useState(() => readStoredIds("creator-universe-recent-works"));
  const [libraryStorageOwner, setLibraryStorageOwner] = useState("anonymous");
  const [pendingPurchaseWorkId, setPendingPurchaseWorkId] = useState(readerWorks[0].id);
  const [paymentMode, setPaymentMode] = useState<"charge" | "content">("charge");
  const [discoverCreatorSearch, setDiscoverCreatorSearch] = useState("");
  const [discoverCreatorRole, setDiscoverCreatorRole] = useState("ALL");
  const [project, setProject] = useState<Project | null>(null);
  const [settlement, setSettlement] = useState<SettlementDashboard | null>(null);
  const [settlementConfig, setSettlementConfig] = useState<SettlementConfig>(() => buildSettlementConfig(null));
  const [settlementMessage, setSettlementMessage] = useState("");
  const [wallet, setWallet] = useState<number | null>(null);
  const [walletDetail, setWalletDetail] = useState<WalletDetail | null>(null);
  const [walletFilter, setWalletFilter] = useState<"ALL" | WalletTransaction["type"]>("ALL");
  const [contentReviews, setContentReviews] = useState<ContentReview[]>([]);
  const [reviewWorkId, setReviewWorkId] = useState(readerWorks[0].id);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [supportCategory, setSupportCategory] = useState("PAYMENT");
  const [supportBody, setSupportBody] = useState("");
  const [reportTargetUserId, setReportTargetUserId] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [communityMessage, setCommunityMessage] = useState("");
  const [studioDraft, setStudioDraft] = useState<StudioDraftState>({
    title: "네온 별자리 탐정단",
    format: "웹툰",
    genre: "판타지",
    synopsis: "밤마다 별자리가 사라지는 도시에서 작가, 일러스트레이터, 성우가 함께 확장하는 미스터리 판타지 프로젝트입니다.",
    episodeTitle: "1화. 별빛이 켜지는 골목",
    accessType: "코인 열람",
    priceCoins: 700,
    publishMode: "예약 발행",
    scheduledAt: "2026-05-15 20:00",
    previewText: "무료 미리보기에서는 첫 장면의 분위기와 주인공의 목표가 선명하게 보이도록 구성합니다.",
    uploadMemo: "원고, 콘티, 표지 이미지, 접근성 대본, 오디오 큐시트를 발행 전까지 연결합니다.",
  });
  const [studioFanPostDraft, setStudioFanPostDraft] = useState<StudioFanPostDraftState>({
    title: "1화 러프 컷과 성우 코멘터리",
    postType: "이미지팩",
    accessType: "구독자 전용",
    tierName: "Studio Fan",
    priceCoins: 700,
    summary: "본편 공개 전 러프 이미지, 캐릭터 표정 차이, 녹음 비하인드를 팬에게 먼저 공개합니다.",
    releaseNote: "스포일러가 포함된 컷은 접어서 제공하고, 후원자 댓글에 다음 특전 투표를 연결합니다.",
  });
  const [studioAccessibilityAudit, setStudioAccessibilityAudit] = useState<StudioAccessibilityAuditState>({
    transcriptSync: 94,
    contrastMode: "고대비 통과",
    screenReader: "검수 완료",
    audioLevel: "권장 범위",
    keyboardFlow: "전체 가능",
    altTextStatus: "보강 필요",
    qaMemo: "대본 하이라이트 싱크는 안정적입니다. 표지와 주요 컷의 대체 텍스트만 공개 전 보강하면 좋습니다.",
  });
  const [supportChatInput, setSupportChatInput] = useState("");
  const [supportChatMessages, setSupportChatMessages] = useState([
    { from: "bot", text: "안녕하세요. 크리에이터 유니버스 도움봇입니다. 결제, 정산, 접근성, 신고 중 어떤 도움이 필요하신가요?" },
  ]);
  const [matchingActionMessage, setMatchingActionMessage] = useState("");
  const [isCreatorProfileFormOpen, setIsCreatorProfileFormOpen] = useState(false);
  const [isPublishingCreatorProfile, setIsPublishingCreatorProfile] = useState(false);
  const [isDeletingCreatorProfile, setIsDeletingCreatorProfile] = useState(false);
  const [matchProposalCreator, setMatchProposalCreator] = useState<Creator | null>(null);
  const [matchProposalShare, setMatchProposalShare] = useState(20);
  const [matchProposalMessage, setMatchProposalMessage] = useState("");
  const [isMatchProposalSubmitting, setIsMatchProposalSubmitting] = useState(false);
  const [matchInboxFilter, setMatchInboxFilter] = useState<"all" | "received" | "sent" | "pending" | "accepted">("all");
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isMessengerFullscreen, setIsMessengerFullscreen] = useState(false);
  const [activeChatCreatorId, setActiveChatCreatorId] = useState<string | null>(null);
  const [messengerInput, setMessengerInput] = useState("");
  const [creatorChatThreads, setCreatorChatThreads] = useState<Record<string, CreatorChatMessage[]>>({});
  const [theme, setTheme] = useState(() => localStorage.getItem("creator-universe-theme") || "light");
  const [premiumSubscription, setPremiumSubscription] = useState<PremiumSubscriptionState>(() => createInactivePremiumSubscription());
  const [authMode, setAuthMode] = useState<"login" | "signup" | "recovery" | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(() => readStoredIds("creator-universe-read-notifications"));
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() => readNotificationPreferences());
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSupportBotOpen, setIsSupportBotOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState<PolicyTabId | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [selectedWork, setSelectedWork] = useState<ReaderWork | null>(null);
  const [activePage, setActivePage] = useState<PageId>("home");
  const [activeIntroSlide, setActiveIntroSlide] = useState(0);
  const [status, setStatus] = useState("백엔드 연결 중");
  const [isBootLoading, setIsBootLoading] = useState(true);
  const librarySectionRef = useRef<HTMLElement | null>(null);

  const allPortfolioItems = useMemo(
    () =>
      creators.flatMap((creator) =>
        getCreatorPortfolio(creator).map((item) => ({
          ...item,
          creator,
        })),
      ),
    [creators],
  );

  const filteredCreators = useMemo(() => {
    const normalizedSearch = matchingSearch.trim().toLowerCase();

    return creators.filter((creator) => {
      const portfolios = getCreatorPortfolio(creator);
      const searchableText = [
        creator.displayName,
        creator.username,
        roleLabels[creator.primaryRole],
        creator.headline,
        creator.bio,
        creator.portfolioSummary,
        ...creator.skills,
        ...portfolios.flatMap((item) => [item.title, item.category, item.description, ...item.tags]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesRole = role === "ALL" || creator.primaryRole === role;
      const matchesGenre = matchingFilters.length === 0 || matchingFilters.every((filter) => searchableText.includes(filter.toLowerCase()));
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesRole && matchesGenre && matchesSearch;
    });
  }, [creators, matchingFilters, matchingSearch, role]);

  const filteredPortfolioItems = useMemo(() => {
    const normalizedSearch = matchingSearch.trim().toLowerCase();

    return allPortfolioItems.filter((item) => {
      const searchableText = [
        item.title,
        item.category,
        item.description,
        ...item.tags,
        item.creator.displayName,
        item.creator.username,
        roleLabels[item.creator.primaryRole],
      ]
        .join(" ")
        .toLowerCase();

      const matchesRole = role === "ALL" || item.creator.primaryRole === role;
      const matchesGenre = matchingFilters.length === 0 || matchingFilters.every((filter) => searchableText.includes(filter.toLowerCase()));
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesRole && matchesGenre && matchesSearch;
    });
  }, [allPortfolioItems, matchingFilters, matchingSearch, role]);

  const messengerCreators = useMemo(() => {
    const creatorsWithThreads = creators.filter((creator) => creatorChatThreads[creator.userId]?.length);
    const remainingCreators = creators.filter((creator) => !creatorChatThreads[creator.userId]?.length);
    return [...creatorsWithThreads, ...remainingCreators].slice(0, 5);
  }, [creatorChatThreads, creators]);

  const activeChatCreator = useMemo(() => {
    return creators.find((creator) => creator.userId === activeChatCreatorId) ?? messengerCreators[0] ?? null;
  }, [activeChatCreatorId, creators, messengerCreators]);

  const activeChatMessages = activeChatCreator ? creatorChatThreads[activeChatCreator.userId] ?? [] : [];
  const pendingPurchaseWork = readerWorks.find((work) => work.id === pendingPurchaseWorkId) ?? readerWorks[0];

  const matchProposalInboxItems = useMemo(() => {
    return Object.entries(creatorChatThreads)
      .flatMap(([creatorUserId, messages]) => {
        const partner = creators.find((creator) => creator.userId === creatorUserId) ?? null;

        return messages
          .filter((message) => Boolean(message.matchProposal))
          .map((message) => ({
            id: `${message.matchProposal!.id}-${message.createdAt}`,
            proposal: message.matchProposal!,
            direction: message.from === "me" ? "sent" as const : "received" as const,
            partner,
            createdAt: message.createdAt,
            time: message.time,
            canAccept: message.from === "creator" && message.matchProposal!.status === "PENDING",
          }));
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [creatorChatThreads, creators]);

  const matchInboxCounts = useMemo(
    () => ({
      all: matchProposalInboxItems.length,
      received: matchProposalInboxItems.filter((item) => item.direction === "received").length,
      sent: matchProposalInboxItems.filter((item) => item.direction === "sent").length,
      pending: matchProposalInboxItems.filter((item) => item.proposal.status === "PENDING").length,
      accepted: matchProposalInboxItems.filter((item) => item.proposal.status === "ACCEPTED").length,
    }),
    [matchProposalInboxItems],
  );

  const filteredMatchProposalInboxItems = useMemo(() => {
    return matchProposalInboxItems.filter((item) => {
      if (matchInboxFilter === "pending") {
        return item.proposal.status === "PENDING";
      }
      if (matchInboxFilter === "accepted") {
        return item.proposal.status === "ACCEPTED";
      }
      if (matchInboxFilter === "received" || matchInboxFilter === "sent") {
        return item.direction === matchInboxFilter;
      }
      return true;
    });
  }, [matchInboxFilter, matchProposalInboxItems]);

  const filteredReaderWorks = useMemo(() => {
    const searchTokens = readerSearch
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return readerWorks.filter((work) => {
      const searchableText = [work.title, work.format, work.genre, work.subGenre, work.tagline, ...work.tags].join(" ").toLowerCase();
      const matchesFilters = readerFilters.length === 0 || readerFilters.every((filter) => searchableText.includes(filter.toLowerCase()));
      const matchesSearch = searchTokens.length === 0 || searchTokens.every((token) => searchableText.includes(token));
      const matchesLibrary =
        readerLibraryView === "all" ||
        (readerLibraryView === "recent" && recentWorkIds.includes(work.id)) ||
        (readerLibraryView === "purchased" && purchasedWorkIds.includes(work.id)) ||
        (readerLibraryView === "scrapped" && scrappedWorkIds.includes(work.id));

      return matchesFilters && matchesSearch && matchesLibrary;
    });
  }, [purchasedWorkIds, readerFilters, readerLibraryView, readerSearch, recentWorkIds, scrappedWorkIds]);

  const rankedReaderWorks = useMemo(
    () => [...readerWorks].sort((left, right) => getWorkRankScore(right) - getWorkRankScore(left)),
    [],
  );

  const genreRankings = useMemo(
    () =>
      readerGenreFilters
        .map((genre) => ({
          genre,
          works: readerWorks
            .filter((work) => work.genre === genre || work.tags.includes(genre))
            .sort((left, right) => getWorkRankScore(right) - getWorkRankScore(left))
            .slice(0, 3),
        }))
        .filter((ranking) => ranking.works.length > 0),
    [],
  );

  const purchasedWorks = useMemo(
    () => readerWorks.filter((work) => purchasedWorkIds.includes(work.id)),
    [purchasedWorkIds],
  );

  const scrappedWorks = useMemo(
    () => readerWorks.filter((work) => scrappedWorkIds.includes(work.id)),
    [scrappedWorkIds],
  );

  const recentWorks = useMemo(
    () =>
      recentWorkIds
        .map((workId) => readerWorks.find((work) => work.id === workId))
        .filter(Boolean) as ReaderWork[],
    [recentWorkIds],
  );

  const followedNewEpisodeWorks = useMemo(() => {
    const followedIds = Array.from(new Set([...scrappedWorkIds, ...recentWorkIds]));
    return followedIds
      .map((workId) => readerWorks.find((work) => work.id === workId))
      .filter((work): work is ReaderWork => Boolean(work && newEpisodeAlertMap[work.id]))
      .slice(0, 4);
  }, [recentWorkIds, scrappedWorkIds]);

  const discoverCreators = useMemo(() => {
    const searchTokens = discoverCreatorSearch
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return creators.filter((creator) => {
      const creatorWorks = readerWorks.filter((work) => work.participantUserIds.includes(creator.userId));
      const searchableText = [
        creator.displayName,
        creator.username,
        roleLabels[creator.primaryRole],
        creator.headline,
        creator.bio,
        ...creator.skills,
        ...creatorWorks.flatMap((work) => [work.title, work.format, work.genre, ...work.tags]),
      ]
        .join(" ")
        .toLowerCase();

      const matchesRole = discoverCreatorRole === "ALL" || creator.primaryRole === discoverCreatorRole;
      const matchesSearch = searchTokens.length === 0 || searchTokens.every((token) => searchableText.includes(token));

      return matchesRole && matchesSearch;
    });
  }, [creators, discoverCreatorRole, discoverCreatorSearch]);

  const myCreatorProfile = useMemo(
    () => creators.find((creator) => creator.userId === user?.id) ?? null,
    [creators, user?.id],
  );

  const myStudioWorks = useMemo(() => {
    if (!myCreatorProfile) {
      return [];
    }

    return readerWorks.filter((work) => work.participantUserIds.includes(myCreatorProfile.userId));
  }, [myCreatorProfile]);

  const currentWalletDetail = useMemo<WalletDetail>(() => {
    const source = walletDetail ?? walletFallback;
    return {
      ...source,
      balance: wallet ?? source.balance,
    };
  }, [wallet, walletDetail]);

  const filteredWalletTransactions = useMemo(() => {
    return currentWalletDetail.transactions.filter((item) => walletFilter === "ALL" || item.type === walletFilter);
  }, [currentWalletDetail.transactions, walletFilter]);

  const notificationItems = useMemo<NotificationItem[]>(() => {
    if (!token) {
      return [];
    }

    const items: NotificationItem[] = [];
    const pendingReceivedProposal = matchProposalInboxItems.find(
      (item) => item.direction === "received" && item.proposal.status === "PENDING",
    );
    const acceptedProposal = matchProposalInboxItems.find((item) => item.proposal.status === "ACCEPTED");
    const latestWalletTransaction = currentWalletDetail.transactions[0];
    const latestPurchasedWork = purchasedWorks[0];
    const latestScrappedWork = scrappedWorks[0];
    const latestRecentWork = recentWorks[0];

    if (pendingReceivedProposal) {
      const partnerName = pendingReceivedProposal.partner?.displayName ?? pendingReceivedProposal.proposal.requesterName ?? "창작자";
      items.push({
        id: `proposal-pending-${pendingReceivedProposal.proposal.id}`,
        title: `${partnerName}님의 매칭 제안`,
        body: `${pendingReceivedProposal.proposal.projectTitle} · 지분 ${pendingReceivedProposal.proposal.sharePercentage}% 조건을 확인해보세요.`,
        time: pendingReceivedProposal.time,
        page: "matching",
        tone: "match",
        actionLabel: "제안함 열기",
      });
    }

    if (acceptedProposal && notificationPreferences.settlement) {
      items.push({
        id: `proposal-accepted-${acceptedProposal.proposal.id}`,
        title: "팀원 합류가 완료됐어요",
        body: `${acceptedProposal.proposal.projectTitle} 제안이 수락되어 정산 팀원 목록에 반영됩니다.`,
        time: acceptedProposal.time,
        page: "settlement",
        tone: "settlement",
        actionLabel: "정산 보기",
      });
    }

    if (notificationPreferences.newEpisode) {
      followedNewEpisodeWorks.forEach((work) => {
        const alert = newEpisodeAlertMap[work.id];
        items.push({
          id: `new-episode-${work.id}-${work.episodes + 1}`,
          title: `${work.title} 새 회차가 공개됐어요`,
          body: `${alert.title} · ${alert.episodeLabel}을 이어서 확인해보세요.`,
          time: alert.publishedAt,
          page: "discover",
          tone: "content",
          actionLabel: "새 회차 보기",
          libraryView: recentWorkIds.includes(work.id) ? "recent" : "scrapped",
        });
      });
    }

    if (latestWalletTransaction) {
      items.push({
        id: `wallet-${latestWalletTransaction.id}`,
        title: latestWalletTransaction.title,
        body: `${getWalletTypeLabel(latestWalletTransaction.type)} ${formatCoins(Math.abs(latestWalletTransaction.amount))} · ${latestWalletTransaction.status}`,
        time: formatDateTime(latestWalletTransaction.createdAt),
        page: "wallet",
        tone: "wallet",
        actionLabel: "지갑 보기",
      });
    }

    if (latestPurchasedWork) {
      items.push({
        id: `purchased-${latestPurchasedWork.id}`,
        title: "결제한 작품을 이어볼 수 있어요",
        body: `${latestPurchasedWork.title} 열람권이 보관함에 저장되어 있습니다.`,
        time: "내 작품",
        page: "discover",
        tone: "content",
        actionLabel: "보관함 이동",
        libraryView: "purchased",
      });
    }

    if (latestRecentWork && latestRecentWork.id !== latestPurchasedWork?.id) {
      items.push({
        id: `recent-${latestRecentWork.id}`,
        title: "최근 본 작품을 이어볼까요?",
        body: `${latestRecentWork.title} 상세를 마지막으로 확인했습니다.`,
        time: "이어보기",
        page: "discover",
        tone: "content",
        actionLabel: "최근 본 작품",
        libraryView: "recent",
      });
    }

    if (latestScrappedWork) {
      items.push({
        id: `scrapped-${latestScrappedWork.id}`,
        title: "스크랩한 작품 업데이트 확인",
        body: `${latestScrappedWork.title}처럼 저장한 작품을 한곳에서 다시 볼 수 있어요.`,
        time: "스크랩",
        page: "discover",
        tone: "content",
        actionLabel: "스크랩 보기",
        libraryView: "scrapped",
      });
    }

    if (premiumSubscription.isActive) {
      items.push({
        id: `premium-${premiumSubscription.nextBillingDate}`,
        title: "프리미엄 구독이 활성화되어 있어요",
        body: `다음 재결제일은 ${formatDateOnly(premiumSubscription.nextBillingDate)}입니다.`,
        time: "구독",
        page: "home",
        tone: "premium",
        actionLabel: "구독 관리",
        openAccount: true,
      });
    }

    if (notificationPreferences.marketing) {
      marketingAnnouncements.forEach((announcement) => {
        items.push({
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          time: "이벤트",
          page: "home",
          tone: "marketing",
          actionLabel: announcement.actionLabel,
          openAccount: announcement.id === "marketing-premium-preview",
        });
      });
    }

    if (myCreatorProfile && !pendingReceivedProposal) {
      items.push({
        id: `studio-profile-${myCreatorProfile.id}`,
        title: "창작자 프로필이 공개 중입니다",
        body: "매칭 보드에서 내 프로필을 보고 팀원이 채팅이나 제안을 보낼 수 있어요.",
        time: "스튜디오",
        page: "studio",
        tone: "studio",
        actionLabel: "스튜디오 보기",
      });
    }

    if (items.length === 0) {
      items.push({
        id: "welcome-notification",
        title: "크리에이터 유니버스에 오신 걸 환영해요",
        body: "작품 스크랩, 코인 충전, 매칭 제안이 생기면 이곳에서 바로 알려드릴게요.",
        time: "처음 시작",
        page: "discover",
        tone: "content",
        actionLabel: "작품 둘러보기",
      });
    }

    return items.slice(0, 6);
  }, [
    currentWalletDetail.transactions,
    followedNewEpisodeWorks,
    matchProposalInboxItems,
    myCreatorProfile,
    notificationPreferences.marketing,
    notificationPreferences.newEpisode,
    notificationPreferences.settlement,
    premiumSubscription.isActive,
    premiumSubscription.nextBillingDate,
    purchasedWorks,
    recentWorkIds,
    recentWorks,
    scrappedWorks,
    token,
  ]);

  const unreadNotificationCount = notificationItems.filter((item) => !readNotificationIds.includes(item.id)).length;

  const settlementPreview = useMemo(() => {
    const grossAmount = settlement?.grossAmount ?? 100000;
    const platformFeeAmount = Math.floor(grossAmount * (settlementConfig.platformFeeRate / 100));
    const distributableAmount = grossAmount - platformFeeAmount;
    const shareTotal = settlementConfig.members.reduce((total, member) => total + Number(member.sharePercentage || 0), 0);
    const members = settlementConfig.members.map((member) => ({
      ...member,
      expectedSettlement: Math.floor(distributableAmount * (Number(member.sharePercentage || 0) / 100)),
    }));
    const mySettlement = members.find((member) => member.userId === user?.id);

    return {
      grossAmount,
      platformFeeAmount,
      distributableAmount,
      shareTotal,
      members,
      mySettlementAmount: mySettlement?.expectedSettlement ?? 0,
    };
  }, [settlement?.grossAmount, settlementConfig, user?.id]);

  const studioProfileCompletion = useMemo(() => {
    const items = [
      { label: "매칭 프로필 공개", done: Boolean(myCreatorProfile) },
      { label: "소개 문구 작성", done: Boolean(myCreatorProfile?.headline && myCreatorProfile.bio) },
      { label: "스킬 태그 3개 이상", done: Boolean(myCreatorProfile?.skills && myCreatorProfile.skills.length >= 3) },
      { label: "포트폴리오 샘플 등록", done: Boolean(myCreatorProfile && getCreatorPortfolio(myCreatorProfile).length > 0) },
      { label: "대표 작품 연결", done: myStudioWorks.length > 0 },
    ];
    const doneCount = items.filter((item) => item.done).length;

    return {
      items,
      percent: Math.round((doneCount / items.length) * 100),
      doneCount,
    };
  }, [myCreatorProfile, myStudioWorks.length]);

  const studioPublishChecklist = useMemo(() => {
    const items = [
      { label: "작품 제목", done: studioDraft.title.trim().length >= 2 },
      { label: "작품 소개", done: studioDraft.synopsis.trim().length >= 20 },
      { label: "무료 미리보기", done: studioDraft.previewText.trim().length >= 20 },
      { label: "가격/공개 방식", done: studioDraft.accessType === "무료 공개" || Number(studioDraft.priceCoins) > 0 },
      { label: "정산 지분 100%", done: settlementPreview.shareTotal === 100 },
      { label: "접근성 대본 메모", done: studioDraft.uploadMemo.includes("대본") || studioDraft.uploadMemo.trim().length >= 12 },
    ];

    return {
      items,
      doneCount: items.filter((item) => item.done).length,
      percent: Math.round((items.filter((item) => item.done).length / items.length) * 100),
    };
  }, [settlementPreview.shareTotal, studioDraft]);

  const studioFanPostChecklist = useMemo(() => {
    const items = [
      { label: "포스트 제목", done: studioFanPostDraft.title.trim().length >= 2 },
      { label: "유료/구독 공개 설정", done: Boolean(studioFanPostDraft.accessType) },
      { label: "구독 티어 연결", done: studioFanPostDraft.accessType !== "구독자 전용" || Boolean(studioFanPostDraft.tierName) },
      { label: "코인 가격", done: studioFanPostDraft.accessType === "무료 공개" || Number(studioFanPostDraft.priceCoins) > 0 },
      { label: "팬에게 보일 설명", done: studioFanPostDraft.summary.trim().length >= 20 },
    ];

    return {
      items,
      doneCount: items.filter((item) => item.done).length,
      percent: Math.round((items.filter((item) => item.done).length / items.length) * 100),
    };
  }, [studioFanPostDraft]);

  const studioGrowthInsights = useMemo(() => {
    const works = myStudioWorks.length > 0 ? myStudioWorks : readerWorks.slice(0, 3);
    const totalAudience = works.reduce((sum, work) => sum + parseAudienceCount(work.listeners), 0);
    const averageRating = works.reduce((sum, work) => sum + work.rating, 0) / Math.max(works.length, 1);
    const estimatedCoinSales = works.reduce((sum, work) => sum + work.priceCoins * Math.max(work.episodes, 1), 0);
    const fanPostReadiness = studioFanPostChecklist.percent;
    const publishReadiness = studioPublishChecklist.percent;

    return {
      metrics: [
        { label: "누적 감상", value: `${Math.round(totalAudience / 1000).toLocaleString("ko-KR")}K`, detail: "참여 작품 기준", icon: <Users size={20} /> },
        { label: "평균 평점", value: averageRating.toFixed(1), detail: "독자 만족도", icon: <Star size={20} /> },
        { label: "예상 판매 풀", value: formatCoins(estimatedCoinSales), detail: "회차 가격 합산", icon: <Coins size={20} /> },
        { label: "팬 수익화 준비", value: `${fanPostReadiness}%`, detail: "유료 포스트 체크", icon: <Heart size={20} /> },
      ],
      funnel: [
        { label: "작품 발견", rate: 82, caption: "추천/랭킹 진입" },
        { label: "상세 진입", rate: 64, caption: "참여 창작자 클릭" },
        { label: "코인 결제", rate: 41, caption: "열람권 구매" },
        { label: "팬 구독", rate: premiumSubscription.isActive ? 36 : 24, caption: "멤버십 전환" },
      ],
      actions: [
        publishReadiness < 100 ? "발행 체크리스트를 완성해 예약 공개 상태로 바꾸기" : "이번 주 대표작을 홈 추천 후보로 올리기",
        fanPostReadiness < 100 ? "구독자 전용 포스트 설명과 가격을 마무리하기" : "팬 포스트를 작품 상세 하단에 연결하기",
        myCreatorProfile ? "포트폴리오 상단에 가장 반응 좋은 작품을 고정하기" : "매칭 프로필을 공개해 작품 크레딧과 연결하기",
      ],
    };
  }, [myCreatorProfile, myStudioWorks, premiumSubscription.isActive, studioFanPostChecklist.percent, studioPublishChecklist.percent]);

  const studioAccessibilityChecklist = useMemo(() => {
    const items = [
      { label: "대본-오디오 싱크", done: studioAccessibilityAudit.transcriptSync >= 90, detail: `${studioAccessibilityAudit.transcriptSync}% 일치` },
      { label: "고대비 표시", done: studioAccessibilityAudit.contrastMode.includes("통과"), detail: studioAccessibilityAudit.contrastMode },
      { label: "스크린리더 구조", done: studioAccessibilityAudit.screenReader.includes("완료"), detail: studioAccessibilityAudit.screenReader },
      { label: "오디오 음량", done: studioAccessibilityAudit.audioLevel.includes("권장"), detail: studioAccessibilityAudit.audioLevel },
      { label: "키보드/제스처 이동", done: studioAccessibilityAudit.keyboardFlow.includes("가능"), detail: studioAccessibilityAudit.keyboardFlow },
      { label: "이미지 대체 텍스트", done: studioAccessibilityAudit.altTextStatus.includes("완료"), detail: studioAccessibilityAudit.altTextStatus },
    ];
    const doneCount = items.filter((item) => item.done).length;

    return {
      items,
      doneCount,
      percent: Math.round((doneCount / items.length) * 100),
      status: doneCount === items.length ? "발행 가능" : "보강 필요",
    };
  }, [studioAccessibilityAudit]);

  const settlementDonutStyle = useMemo(() => {
    const colors = ["var(--brand)", "var(--cyan)", "var(--violet)", "var(--green)", "#ffb84d"];
    let cursor = 0;
    const segments = settlementConfig.members.map((member, index) => {
      const start = cursor;
      cursor += Number(member.sharePercentage || 0);
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    });

    return {
      background: `radial-gradient(circle, var(--surface) 0 45%, transparent 46%), conic-gradient(${segments.join(", ")})`,
    };
  }, [settlementConfig.members]);

  async function loadData(currentToken = token) {
    const query = role === "ALL" ? "" : `?role=${role}`;
    const [creatorData, projectData, settlementData] = await Promise.all([
      request<Creator[]>(`/api/creators${query}`, currentToken),
      request<Project>(`/api/projects/${PROJECT_ID}`, currentToken),
      currentToken
        ? request<SettlementDashboard>(`/api/projects/${PROJECT_ID}/settlement-dashboard`, currentToken)
        : Promise.resolve(null),
    ]);

    setCreators(creatorData.map(normalizeCreator));
    setProject(projectData);
    setSettlement(settlementData);
    try {
      const reviews = await request<ContentReview[]>("/api/content/reviews", currentToken);
      setContentReviews(reviews.map(normalizeContentReview));
    } catch {
      setContentReviews([]);
    }

    if (currentToken) {
      const walletData = await request<{ balance: string | number }>("/api/users/me/wallet", currentToken);
      setWallet(Number(walletData.balance));
      try {
        const detail = await request<WalletDetail>("/api/users/me/wallet/detail", currentToken);
        setWalletDetail(detail);
      } catch {
        setWalletDetail({
          ...walletFallback,
          balance: Number(walletData.balance),
        });
      }
      try {
        const chatThreads = await request<ChatThread[]>("/api/chats/threads", currentToken);
        setCreatorChatThreads(mapChatThreads(chatThreads));
      } catch {
        setCreatorChatThreads({});
      }
    } else {
      setWallet(null);
      setWalletDetail(null);
      setCreatorChatThreads({});
    }

    setStatus("백엔드 연결 완료");
  }

  async function refreshCreatorChats(currentToken = token) {
    if (!currentToken) {
      setCreatorChatThreads({});
      return;
    }

    const chatThreads = await request<ChatThread[]>("/api/chats/threads", currentToken);
    setCreatorChatThreads(mapChatThreads(chatThreads));
  }

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("creator-universe-theme", theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBootLoading(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user?.id || libraryStorageOwner !== user.id) {
      return;
    }
    localStorage.setItem(getUserLibraryStorageKey(user.id, "purchased-works"), JSON.stringify(purchasedWorkIds));
  }, [libraryStorageOwner, purchasedWorkIds, user?.id]);

  useEffect(() => {
    if (!user?.id || libraryStorageOwner !== user.id) {
      return;
    }
    localStorage.setItem(getUserLibraryStorageKey(user.id, "scrapped-works"), JSON.stringify(scrappedWorkIds));
  }, [libraryStorageOwner, scrappedWorkIds, user?.id]);

  useEffect(() => {
    const owner = user?.id ?? "anonymous";
    if (libraryStorageOwner !== owner) {
      return;
    }
    const storageKey = user?.id ? getUserLibraryStorageKey(user.id, "recent-works") : "creator-universe-recent-works";
    localStorage.setItem(storageKey, JSON.stringify(recentWorkIds));
  }, [libraryStorageOwner, recentWorkIds, user?.id]);

  useEffect(() => {
    const owner = user?.id ?? "anonymous";
    if (libraryStorageOwner !== owner) {
      return;
    }
    const storageKey = user?.id ? getUserLibraryStorageKey(user.id, "read-notifications") : "creator-universe-read-notifications";
    localStorage.setItem(storageKey, JSON.stringify(readNotificationIds));
  }, [libraryStorageOwner, readNotificationIds, user?.id]);

  useEffect(() => {
    localStorage.setItem("creator-universe-notification-preferences", JSON.stringify(notificationPreferences));
  }, [notificationPreferences]);

  useEffect(() => {
    if (!selectedWork) {
      return;
    }

    setRecentWorkIds((current) => [selectedWork.id, ...current.filter((workId) => workId !== selectedWork.id)].slice(0, 12));
  }, [selectedWork]);

  useEffect(() => {
    if (user?.id) {
      setPremiumSubscription(readUserPremiumSubscription(user.id));
      setPurchasedWorkIds(readStoredIds(getUserLibraryStorageKey(user.id, "purchased-works")));
      setScrappedWorkIds(readStoredIds(getUserLibraryStorageKey(user.id, "scrapped-works")));
      setRecentWorkIds(readStoredIds(getUserLibraryStorageKey(user.id, "recent-works")));
      setReadNotificationIds(readStoredIds(getUserLibraryStorageKey(user.id, "read-notifications")));
      setLibraryStorageOwner(user.id);
    } else {
      setPremiumSubscription(createInactivePremiumSubscription());
      setPurchasedWorkIds([]);
      setScrappedWorkIds([]);
      setRecentWorkIds(readStoredIds("creator-universe-recent-works"));
      setReadNotificationIds(readStoredIds("creator-universe-read-notifications"));
      setLibraryStorageOwner("anonymous");
    }
  }, [user?.id]);

  useEffect(() => {
    if (settlement?.members.length) {
      setSettlementConfig((current) => ({
        ...current,
        platformFeeRate: Math.round(settlement.appliedFeeRate * 100),
        members: settlement.members.map((member, index) => normalizeSettlementMember({
          userId: member.userId,
          displayName: member.displayName,
          username: member.username,
          memberRole: member.memberRole,
          sharePercentage: member.sharePercentage,
        }, index)),
      }));
    }
  }, [settlement?.appliedFeeRate, settlement?.members]);

  useEffect(() => {
    if (activePage !== "home") {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIntroSlide((index) => (index + 1) % introSlides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "home") {
      return;
    }

    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );

    for (const target of revealTargets) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, [activePage]);

  useEffect(() => {
    let isCurrent = true;

    if (!token) {
      setUser(null);
      void loadData(null).catch((error) => setStatus(error.message));
      return () => {
        isCurrent = false;
      };
    }

    async function verifySessionAndLoadData() {
      try {
        const me = await request<User | null>("/api/auth/me", token);
        if (!isCurrent) {
          return;
        }

        if (!me) {
          throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
        }

        setUser(me);
        await loadData(token).catch((error) => {
          if (isCurrent) {
            setStatus(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
          }
        });
      } catch (error) {
        if (!isCurrent) {
          return;
        }
        setStatus(error instanceof Error ? error.message : "로그인 상태를 확인하지 못했습니다.");
        setUser(null);
        setToken(null);
        localStorage.removeItem("creator-universe-token");
      }
    }

    void verifySessionAndLoadData();

    return () => {
      isCurrent = false;
    };
  }, [token, role]);

  function openPayment() {
    setPaymentMode("charge");
    setIsPaymentOpen(true);
  }

  function openWorkPayment(workId: string) {
    if (!token) {
      setAuthMode("login");
      return;
    }
    setPendingPurchaseWorkId(workId);
    setPaymentMode("content");
    setIsPaymentOpen(true);
  }

  async function handlePaymentConfirm(payload: { mode: "charge" | "content"; coinAmount: number; paymentAmountKrw?: number }) {
    const authToken = getActiveAuthToken(token);
    if (!authToken) {
      setAuthMode("login");
      throw new Error("로그인이 필요합니다. 다시 로그인한 뒤 결제를 진행해 주세요.");
    }

    if (payload.mode === "charge") {
      const chargeResult = await request<{ walletBalance: string | number }>("/api/users/me/wallet/charge", authToken, {
        method: "POST",
        body: JSON.stringify({
          coinAmount: payload.coinAmount,
          paymentAmountKrw: payload.paymentAmountKrw,
          externalPaymentId: `charge_${Date.now()}`,
        }),
      });
      setWallet(Number(chargeResult.walletBalance));
    } else {
      await request("/api/settlements/content-purchase", authToken, {
        method: "POST",
        body: JSON.stringify({
          projectId: PROJECT_ID,
          workId: pendingPurchaseWorkId,
          coinAmount: payload.coinAmount,
          externalPaymentId: `web_${Date.now()}`,
        }),
      });
      setPurchasedWorkIds((current) =>
        current.includes(pendingPurchaseWorkId) ? current : [pendingPurchaseWorkId, ...current],
      );
      setActivePage("discover");
    }
    await loadData(authToken);
  }

  function toggleScrap(workId: string) {
    if (!token) {
      setAuthMode("login");
      return;
    }

    setScrappedWorkIds((current) =>
      current.includes(workId) ? current.filter((id) => id !== workId) : [workId, ...current],
    );
  }

  function openReaderLibrary(view: (typeof libraryViewItems)[number]["id"]) {
    setReaderLibraryView(view);
    setReaderSearch("");
    setReaderFilters([]);
    navigate("discover");
    window.setTimeout(() => {
      librarySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function navigate(page: PageId) {
    if (protectedPages.has(page) && !token) {
      setAuthMode("login");
      setIsMobileMenuOpen(false);
      setIsAccountMenuOpen(false);
      return;
    }

    setActivePage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNotificationItem(item: NotificationItem) {
    setReadNotificationIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
    setIsNotificationOpen(false);
    setIsAccountMenuOpen(false);

    if (item.openAccount) {
      setIsAccountModalOpen(true);
      return;
    }

    if (item.libraryView) {
      openReaderLibrary(item.libraryView);
      return;
    }

    navigate(item.page);
  }

  function markAllNotificationsRead() {
    setReadNotificationIds((current) => {
      const nextIds = notificationItems.map((item) => item.id);
      return Array.from(new Set([...current, ...nextIds]));
    });
  }

  function toggleNotificationPreference(key: keyof NotificationPreferences) {
    setNotificationPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function toggleReaderFilter(filter: string) {
    if (filter === "전체") {
      setReaderFilters([]);
      return;
    }

    setReaderFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    );
  }

  function toggleMatchingFilter(filter: string) {
    if (filter === "전체") {
      setMatchingFilters([]);
      setSelectedGenre("전체");
      return;
    }

    setMatchingFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    );
    setSelectedGenre(filter);
  }

  async function refreshAfterCommunityAction(message: string) {
    setCommunityMessage(message);
    await loadData(token);
  }

  async function submitReview(targetWorkId = reviewWorkId) {
    if (!token) {
      setAuthMode("login");
      return;
    }
    const review = await request<ContentReview>("/api/content/reviews", token, {
      method: "POST",
      body: JSON.stringify({ workId: targetWorkId, rating: reviewRating, body: reviewBody }),
    });
    setContentReviews((current) => [normalizeContentReview(review), ...current]);
    setReviewBody("");
    setCommunityMessage("리뷰가 등록되었습니다.");
  }

  async function submitSupportTicket() {
    if (!token) {
      setAuthMode("login");
      return;
    }
    await request("/api/support/tickets", token, {
      method: "POST",
      body: JSON.stringify({ category: supportCategory, body: supportBody }),
    });
    setSupportBody("");
    setCommunityMessage("고객센터 문의가 접수되었습니다.");
  }

  async function submitUserReport() {
    if (!token) {
      setAuthMode("login");
      return;
    }
    await request("/api/reports", token, {
      method: "POST",
      body: JSON.stringify({ targetUserId: reportTargetUserId, reason: reportReason, context: "고객센터 신고 폼" }),
    });
    setReportReason("");
    setCommunityMessage("사용자 신고가 접수되었습니다.");
  }

  function sendSupportBotMessage(message = supportChatInput) {
    const normalized = message.trim();
    if (!normalized) {
      return;
    }

    const lowerMessage = normalized.toLowerCase();
    let botReply = "문의 내용을 확인했어요. 더 정확한 처리를 위해 오른쪽 1:1 문의 카드에 내용을 남기면 운영팀 티켓으로 접수됩니다.";

    if (lowerMessage.includes("환불") || lowerMessage.includes("결제") || lowerMessage.includes("코인")) {
      botReply = "결제/환불 문의는 결제 시각, 코인 금액, 열람권 지급 여부를 함께 적어주시면 가장 빠르게 확인할 수 있어요.";
      setSupportCategory("PAYMENT");
    } else if (lowerMessage.includes("정산") || lowerMessage.includes("수익") || lowerMessage.includes("지분")) {
      botReply = "정산 문의는 프로젝트명, 팀원 지분율, 문제가 발생한 정산월을 적어주세요. 고정 수수료와 팀원별 분배 내역을 같이 확인합니다.";
      setSupportCategory("SETTLEMENT");
    } else if (lowerMessage.includes("접근") || lowerMessage.includes("시각") || lowerMessage.includes("감상") || lowerMessage.includes("대본")) {
      botReply = "접근성 문의는 사용 기기, 스크린리더 종류, 문제가 생긴 감상 화면을 알려주시면 우선순위로 확인할게요.";
      setSupportCategory("ACCESSIBILITY");
    } else if (lowerMessage.includes("신고") || lowerMessage.includes("불친절") || lowerMessage.includes("괴롭힘")) {
      botReply = "사용자 신고는 대상 창작자와 상황 설명이 필요해요. 아래 신고 카드에서 대상을 선택하고 내용을 남겨주세요.";
    } else if (lowerMessage.includes("버그") || lowerMessage.includes("오류") || lowerMessage.includes("안돼")) {
      botReply = "버그 신고는 발생 화면, 클릭한 버튼, 재현 순서를 적어주시면 좋아요. 가능하면 오류 문구도 함께 남겨주세요.";
      setSupportCategory("BUG");
    }

    setSupportChatMessages((current) => [
      ...current,
      { from: "user", text: normalized },
      { from: "bot", text: botReply },
    ]);
    setSupportChatInput("");
  }

  function openCreatorMessenger(creator?: Creator) {
    if (!token) {
      setAuthMode("login");
      return;
    }

    const nextCreator = creator ?? activeChatCreator ?? messengerCreators[0] ?? null;
    if (nextCreator) {
      setActiveChatCreatorId(nextCreator.userId);
    }
    setIsMessengerOpen(true);
    setIsSupportBotOpen(false);
  }

  async function submitCreatorProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const authToken = getActiveAuthToken(token);
    if (!authToken) {
      setAuthMode("login");
      return;
    }

    const data = new FormData(event.currentTarget);
    const skills = String(data.get("skills") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (skills.length === 0) {
      setMatchingActionMessage("태그를 1개 이상 입력해 주세요. 예: 로맨스, 웹툰, 감정연기");
      return;
    }

    setIsPublishingCreatorProfile(true);
    try {
      await request<Creator>("/api/creators/me", authToken, {
        method: "POST",
        body: JSON.stringify({
          primaryRole: data.get("primaryRole"),
          headline: data.get("headline"),
          bio: data.get("bio"),
          skills,
          availabilityNote: data.get("availabilityNote"),
        }),
      });
      await loadData(authToken);
      setIsCreatorProfileFormOpen(false);
      setMatchingActionMessage("내 매칭 프로필이 등록되었습니다. 이제 다른 사용자가 팀원 찾기에서 나를 발견할 수 있어요.");
    } catch (error) {
      setMatchingActionMessage(`매칭 프로필 등록 실패: ${getFriendlyError(error)}`);
    } finally {
      setIsPublishingCreatorProfile(false);
    }
  }

  async function deleteMyCreatorProfile() {
    const authToken = getActiveAuthToken(token);
    if (!authToken) {
      setAuthMode("login");
      return;
    }

    const confirmed = window.confirm("내 매칭 프로필을 보드에서 내릴까요? 나중에 다시 등록할 수 있습니다.");
    if (!confirmed) {
      return;
    }

    setIsDeletingCreatorProfile(true);
    try {
      await request<{ deleted: boolean }>("/api/creators/me", authToken, { method: "DELETE" });
      await loadData(authToken);
      setIsCreatorProfileFormOpen(false);
      setMatchingActionMessage("내 매칭 프로필을 보드에서 내렸습니다. 다시 올리고 싶으면 언제든 재등록할 수 있어요.");
    } catch (error) {
      setMatchingActionMessage(`매칭 프로필 삭제 실패: ${getFriendlyError(error)}`);
    } finally {
      setIsDeletingCreatorProfile(false);
    }
  }

  async function sendCreatorChat(creator: Creator) {
    if (!token) {
      setAuthMode("login");
      return;
    }
    const body = `${creator.displayName}님, 포트폴리오를 보고 협업 상담을 드리고 싶습니다.`;
    await request("/api/chats/messages", token, {
      method: "POST",
      body: JSON.stringify({
        receiverUserId: creator.userId,
        body,
      }),
    });
    await refreshCreatorChats(token);
    setActiveChatCreatorId(creator.userId);
    setIsMessengerOpen(true);
    setIsSupportBotOpen(false);
    setMatchingActionMessage(`${creator.displayName}님과 채팅방을 열었습니다. 오른쪽 하단 메신저에서 이어서 대화할 수 있어요.`);
  }

  async function sendMessengerMessage() {
    if (!token) {
      setAuthMode("login");
      return;
    }
    if (!activeChatCreator) {
      return;
    }
    const body = messengerInput.trim();
    if (!body) {
      return;
    }

    setMessengerInput("");
    await request("/api/chats/messages", token, {
      method: "POST",
      body: JSON.stringify({
        receiverUserId: activeChatCreator.userId,
        body,
      }),
    });
    await refreshCreatorChats(token);
  }

  function openMatchProposal(creator: Creator) {
    if (!token) {
      setAuthMode("login");
      return;
    }
    const suggestedShare = creator.primaryRole === "VOICE_ACTOR" || creator.primaryRole === "SOUND_DIRECTOR" ? 25 : 20;
    setMatchProposalCreator(creator);
    setMatchProposalShare(suggestedShare);
    setMatchProposalMessage(
      `${creator.displayName}님, 포트폴리오를 보고 함께 협업하고 싶습니다. ${suggestedShare}% 수익 지분 조건으로 매칭을 제안드려요.`,
    );
  }

  async function submitMatchProposal() {
    if (!token || !matchProposalCreator) {
      setAuthMode("login");
      return;
    }
    setIsMatchProposalSubmitting(true);
    try {
      await request("/api/matching/requests", token, {
        method: "POST",
        body: JSON.stringify({
          targetUserId: matchProposalCreator.userId,
          projectId: PROJECT_ID,
          projectTitle: project?.title || "Creator Universe Pilot",
          projectType: matchingFilters.join(", ") || "멀티 콘텐츠 협업",
          memberRole: matchProposalCreator.primaryRole,
          sharePercentage: matchProposalShare,
          message: matchProposalMessage,
        }),
      });
      await refreshCreatorChats(token);
      setActiveChatCreatorId(matchProposalCreator.userId);
      setIsMessengerOpen(true);
      setIsSupportBotOpen(false);
      setMatchingActionMessage(`${matchProposalCreator.displayName}님에게 ${matchProposalShare}% 수익 지분 조건으로 매칭 제안을 보냈습니다.`);
      setMatchProposalCreator(null);
    } finally {
      setIsMatchProposalSubmitting(false);
    }
  }

  async function acceptMatchProposal(proposalId: string) {
    if (!token) {
      setAuthMode("login");
      return;
    }
    const result = await request<{ members: SettlementMemberConfig[] }>(`/api/matching/requests/${proposalId}/accept`, token, {
      method: "POST",
    });
    if (result.members?.length) {
      setSettlementConfig((current) => ({
        ...current,
        members: result.members,
      }));
    }
    await refreshCreatorChats(token);
    await loadData(token);
    setMatchingActionMessage("매칭 조건을 수락했습니다. 새 팀원이 정산 팀원 목록에 반영되었습니다.");
  }

  async function requestCreatorMatch(creator: Creator) {
    if (!token) {
      setAuthMode("login");
      return;
    }
    await request("/api/matching/requests", token, {
      method: "POST",
      body: JSON.stringify({
        targetUserId: creator.userId,
        projectType: matchingFilters.join(", ") || "멀티 콘텐츠 협업",
        message: "작품 세계관을 함께 만들 팀원으로 매칭 요청을 보냅니다.",
      }),
    });
    setMatchingActionMessage(`${creator.displayName}님에게 매칭 요청을 보냈습니다.`);
  }

  function updateMemberShare(userId: string, sharePercentage: number) {
    setSettlementMessage("");
    setSettlementConfig((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.userId === userId
          ? { ...member, sharePercentage: Math.max(0, Math.min(100, Number.isFinite(sharePercentage) ? sharePercentage : 0)) }
          : member,
      ),
    }));
  }

  function applySettlementPreset(preset: "audioDrama" | "equal") {
    setSettlementMessage("");
    setSettlementConfig((current) => {
      const leaderIndex = current.members.findIndex((member) => ["WRITER", "PRODUCER"].includes(member.memberRole));
      const normalizedLeaderIndex = leaderIndex >= 0 ? leaderIndex : 0;
      const shares = preset === "audioDrama"
        ? current.members.map((_, index) => {
            if (index === normalizedLeaderIndex) {
              return 40;
            }

            const teammateCount = Math.max(current.members.length - 1, 1);
            return Math.floor(60 / teammateCount);
          })
        : current.members.map(() => Math.floor(100 / current.members.length));
      const remainder = 100 - shares.reduce((sum, share) => sum + share, 0);

      return {
        ...current,
        members: current.members.map((member, index) => ({
          ...member,
          sharePercentage: (shares[index] ?? 0) + (index === current.members.length - 1 ? remainder : 0),
        })),
      };
    });
  }

  function saveSettlementSettings() {
    if (settlementPreview.shareTotal !== 100) {
      setSettlementMessage(`지분율 합계가 ${settlementPreview.shareTotal}%입니다. 정확히 100%가 되도록 조정해 주세요.`);
      return;
    }

    setSettlementMessage("정산 설정이 저장되었습니다. 플랫폼 수수료는 일반 15%, 공식 파트너 8% 고정 정책으로 적용됩니다.");
  }

  function updateStudioDraft<K extends keyof StudioDraftState>(key: K, value: StudioDraftState[K]) {
    setStudioDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateStudioFanPostDraft<K extends keyof StudioFanPostDraftState>(key: K, value: StudioFanPostDraftState[K]) {
    setStudioFanPostDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateStudioAccessibilityAudit<K extends keyof StudioAccessibilityAuditState>(
    key: K,
    value: StudioAccessibilityAuditState[K],
  ) {
    setStudioAccessibilityAudit((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submitStudioWorkDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "새 작품");
    const episodeTitle = String(data.get("episodeTitle") || "새 회차");
    setCommunityMessage(`${title} · ${episodeTitle} 발행 초안이 저장되었습니다. 체크리스트를 모두 채우면 예약 발행으로 넘길 수 있어요.`);
  }

  function submitStudioFanPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("fanPostTitle") || "팬 포스트");
    const accessType = String(data.get("fanPostAccess") || "구독자 전용");
    setCommunityMessage(`${title} 팬 포스트 초안이 저장되었습니다. ${accessType} 상품으로 창작자 채널에 노출할 수 있어요.`);
  }

  function saveAccessibilityAudit() {
    setCommunityMessage(`접근성 검수 리포트가 저장되었습니다. 현재 상태는 ${studioAccessibilityChecklist.status}, 준비도는 ${studioAccessibilityChecklist.percent}%입니다.`);
  }

  function submitStudioEpisode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("episodeTitle") || "새 회차");
    setCommunityMessage(`${title} 회차 업로드 초안이 저장되었습니다. 실제 파일 업로드 기능은 다음 단계에서 연결하면 됩니다.`);
    event.currentTarget.reset();
  }

  function saveStudioTeamPlan() {
    setCommunityMessage("팀원 초대와 수익 지분 설정이 저장되었습니다. 매칭 제안함 기능과 연결하면 수락 즉시 팀에 합류시킬 수 있어요.");
  }

  function completeAuth(nextUser: User, nextToken: string) {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("creator-universe-token", nextToken);
  }

  async function logout() {
    if (token) {
      await request("/api/auth/logout", token, { method: "POST" }).catch(() => null);
    }
    setUser(null);
    setToken(null);
    if (protectedPages.has(activePage)) {
      setActivePage("home");
    }
    setIsAccountMenuOpen(false);
    setIsAccountModalOpen(false);
    localStorage.removeItem("creator-universe-token");
  }

  async function deleteAccount() {
    if (!token) {
      setAuthMode("login");
      return;
    }

    const confirmed = window.confirm("정말 계정을 탈퇴할까요? 로그인 정보는 삭제되고 결제/정산 기록은 익명 처리되어 보존됩니다.");
    if (!confirmed) {
      return;
    }

    await request("/api/auth/me", token, { method: "DELETE" });
    setUser(null);
    setToken(null);
    setWallet(null);
    setWalletDetail(null);
    setCreatorChatThreads({});
    setIsAccountMenuOpen(false);
    setIsAccountModalOpen(false);
    setActivePage("home");
    localStorage.removeItem("creator-universe-token");
    setStatus("계정 탈퇴가 완료되었습니다.");
  }

  function startPremiumSubscription() {
    if (!token) {
      setAuthMode("login");
      return;
    }

    const now = new Date();
    const nextBillingDate = getNextPremiumBillingDate(now);
    setPremiumSubscription({
      isActive: true,
      startedAt: now.toISOString(),
      nextBillingDate,
    });
    if (user?.id) {
      writeUserPremiumSubscription(user.id, {
        isActive: true,
        startedAt: now.toISOString(),
        nextBillingDate,
      });
    }
    setCommunityMessage(`프리미엄 구독이 시작되었습니다. 다음 재결제일은 ${formatDateOnly(nextBillingDate)}입니다.`);
  }

  function cancelPremiumSubscription() {
    if (!premiumSubscription.isActive) {
      return;
    }

    const confirmed = window.confirm("프리미엄 구독을 해지할까요? 다음 재결제는 중단되고 현재 혜택은 표시상 해지 상태로 전환됩니다.");
    if (!confirmed) {
      return;
    }

    const nextSubscription = {
      ...premiumSubscription,
      isActive: false,
      cancelledAt: new Date().toISOString(),
    };
    setPremiumSubscription(nextSubscription);
    if (user?.id) {
      writeUserPremiumSubscription(user.id, nextSubscription);
    }
    setCommunityMessage("프리미엄 구독이 해지되었습니다. 언제든 다시 시작할 수 있어요.");
  }

  return (
    <div className="app">
      {isBootLoading && (
        <div className="boot-loader" role="status" aria-live="polite">
          <div className="boot-loader-card">
            <div className="loader-cat" aria-hidden="true">
              <span className="cat-shadow" />
              <span className="cat-tail" />
              <span className="cat-body">
                <i className="cat-paw paw-one" />
                <i className="cat-paw paw-two" />
              </span>
              <span className="cat-head">
                <i className="cat-ear ear-left" />
                <i className="cat-ear ear-right" />
                <b className="cat-eye eye-left" />
                <b className="cat-eye eye-right" />
                <em className="cat-nose" />
                <small className="cat-cheek cheek-left" />
                <small className="cat-cheek cheek-right" />
                <strong className="cat-whisker whisker-left" />
                <strong className="cat-whisker whisker-right" />
              </span>
              <span className="cat-heart" />
              <span className="cat-yarn" />
            </div>
            <strong>크리에이터 유니버스 준비 중</strong>
            <p>창작자, 작품, 정산 데이터를 불러오고 있어요.</p>
            <div className="loader-dots" aria-hidden="true"><span /><span /><span /></div>
          </div>
        </div>
      )}
      <header className="topbar">
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-logo"><img src="/logo.png" alt="" /></span>
          <strong>크리에이터 유니버스</strong>
          <em>Audio Studio</em>
        </button>
        <nav className="desktop-nav">
          {navItems.map((item) => (
            <button className={activePage === item.id ? "active" : ""} onClick={() => navigate(item.id)} key={item.id}>
              <span>{item.label}</span>
              <small>{item.helper}</small>
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="ghost-button nav-pay-button" onClick={openPayment}>
            <Coins size={16} /> 결제
          </button>
          <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="테마 변경">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user && (
            <div className="notification-wrap">
              <button
                className={`icon-button notification-trigger ${unreadNotificationCount > 0 ? "has-unread" : ""}`}
                onClick={() => {
                  setIsNotificationOpen((value) => !value);
                  setIsAccountMenuOpen(false);
                }}
                aria-label="알림센터 열기"
                aria-expanded={isNotificationOpen}
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && <span>{Math.min(unreadNotificationCount, 9)}</span>}
              </button>
              {isNotificationOpen && (
                <div className="notification-panel">
                  <div className="notification-panel-head">
                    <div>
                      <strong>알림센터</strong>
                      <small>{unreadNotificationCount > 0 ? `${unreadNotificationCount}개의 새 알림` : "모두 확인했어요"}</small>
                    </div>
                    <button type="button" onClick={markAllNotificationsRead}>모두 읽음</button>
                  </div>
                  <div className="notification-list">
                    {notificationItems.map((item) => {
                      const isUnread = !readNotificationIds.includes(item.id);

                      return (
                        <button
                          className={`notification-item ${item.tone} ${isUnread ? "unread" : ""}`}
                          key={item.id}
                          onClick={() => openNotificationItem(item)}
                          type="button"
                        >
                          <i>
                            {item.tone === "match" && <Users size={16} />}
                            {item.tone === "wallet" && <Coins size={16} />}
                            {item.tone === "content" && <BookOpen size={16} />}
                            {item.tone === "studio" && <Rocket size={16} />}
                            {item.tone === "settlement" && <Split size={16} />}
                            {item.tone === "premium" && <Sparkles size={16} />}
                            {item.tone === "marketing" && <Flame size={16} />}
                          </i>
                          <span>
                            <b>{item.title}</b>
                            <small>{item.body}</small>
                            <em>{item.time} · {item.actionLabel}</em>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {user ? (
            <div className="account-menu-wrap">
              <button
                className="account-trigger"
                onClick={() => {
                  setIsAccountMenuOpen((value) => !value);
                  setIsNotificationOpen(false);
                }}
                aria-expanded={isAccountMenuOpen}
              >
                <span>{user.displayName.slice(0, 1)}</span>
                <b>{user.displayName}</b>
                <ChevronDown size={16} />
              </button>
              {isAccountMenuOpen && (
                <div className="account-dropdown">
                  <button onClick={() => { setIsAccountModalOpen(true); setIsAccountMenuOpen(false); }}><UserRound size={17} /> 내 계정</button>
                  <button onClick={() => { openReaderLibrary("recent"); setIsAccountMenuOpen(false); }}><RefreshCw size={17} /> 최근 본 작품</button>
                  <button onClick={() => { openReaderLibrary("purchased"); setIsAccountMenuOpen(false); }}><BookOpen size={17} /> 결제한 작품</button>
                  <button onClick={() => { openReaderLibrary("scrapped"); setIsAccountMenuOpen(false); }}><Heart size={17} /> 스크랩한 작품</button>
                  <button onClick={() => { navigate("studio"); setIsAccountMenuOpen(false); }}><Rocket size={17} /> 창작자 스튜디오</button>
                  <button onClick={() => { navigate("wallet"); setIsAccountMenuOpen(false); }}><Wallet size={17} /> 내 지갑</button>
                  <button onClick={() => { navigate("settlement"); setIsAccountMenuOpen(false); }}><Split size={17} /> 정산 콘솔</button>
                  <button onClick={() => { setIsAccountModalOpen(true); setIsAccountMenuOpen(false); }}><Settings size={17} /> 정보 변경</button>
                  <button className="danger" onClick={logout}><LogOut size={17} /> 로그아웃</button>
                </div>
              )}
            </div>
          ) : (
            <button className="primary-button compact" onClick={() => setAuthMode("login")}><LogIn size={16} /> 로그인</button>
          )}
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            aria-label="모바일 메뉴 열기"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div className={`mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-drawer-card">
            <p><Sparkles size={16} /> Creator Universe Menu</p>
            {navItems.map((item) => (
              <button className={activePage === item.id ? "active" : ""} key={item.id} onClick={() => navigate(item.id)}>
                <span>{item.label}</span>
                <small>{item.helper}</small>
              </button>
            ))}
            <button className="drawer-pay-button" onClick={() => { setIsMobileMenuOpen(false); openPayment(); }}>
              <Coins size={17} /> 코인 결제창 열기
            </button>
          </div>
        </div>
      </header>

      <main>
        {activePage === "home" && (
          <div className="home-page page-panel">
            <section className={`intro-hero reveal revealed ${introSlides[activeIntroSlide].tone}`}>
              <div className="intro-copy">
                <p className="kicker">{status} · Creator Universe</p>
                <div className="slide-copy-stage">
                  {introSlides.map((slide, index) => (
                    <article className={`slide-copy-panel ${activeIntroSlide === index ? "active" : ""}`} key={slide.eyebrow}>
                      <span className="slide-eyebrow">{slide.eyebrow}</span>
                      <h1>{slide.title}</h1>
                      <p className="lead">{slide.description}</p>
                    </article>
                  ))}
                </div>
                <div className="intro-actions">
                  <button className="primary-button" onClick={() => navigate("matching")}><Users size={18} /> 매칭 둘러보기</button>
                  <button className="ghost-button" onClick={() => navigate("discover")}><BookOpen size={18} /> 작품 둘러보기</button>
                </div>
                <div className="slide-dots" aria-label="소개 슬라이드 선택">
                  {introSlides.map((slide, index) => (
                    <button
                      key={slide.eyebrow}
                      className={activeIntroSlide === index ? "active" : ""}
                      onClick={() => setActiveIntroSlide(index)}
                      aria-label={`${index + 1}번 소개 슬라이드`}
                    />
                  ))}
                </div>
              </div>

              <aside className="studio-visual" aria-label="크리에이터 유니버스 서비스 미리보기">
                <div className="visual-stage">
                  {introSlides.map((slide, index) => (
                    <div className={`visual-slide ${slide.tone} ${activeIntroSlide === index ? "active" : ""}`} key={slide.visualTitle}>
                      <div className="visual-artwork">
                        <div className="aurora-orb orb-one" />
                        <div className="aurora-orb orb-two" />
                        <div className="moon" />
                        <div className="city-lines" />
                        <div className="character-card">
                          <span>{slide.visualLabel}</span>
                          <strong>{slide.visualTitle}</strong>
                        </div>
                        <div className="floating-widget widget-left">
                          <span>{slide.stat}</span>
                          <b>{slide.statLabel}</b>
                        </div>
                        <div className="floating-widget widget-right">
                          <span>{index === 1 ? "8%" : "0%"}</span>
                          <b>{index === 1 ? "파트너 수수료" : "초기 매칭 수수료"}</b>
                        </div>
                      </div>
                      <div className="visual-caption">{slide.statLabel}</div>
                    </div>
                  ))}
                </div>
              </aside>
            </section>

            <section className="intro-metrics reveal">
              <div><strong>0원</strong><span>초기 매칭 수수료</span></div>
              <div><strong>15% / 8%</strong><span>일반 · 파트너 수수료</span></div>
              <div><strong>30:30:40</strong><span>팀 지분율 자동 분배</span></div>
              <div><strong>Voice-first</strong><span>배리어프리 UX</span></div>
            </section>

            <section className="intro-section reveal">
              <div className="section-head intro-head">
                <div>
                <p className="kicker">Why Creator Universe</p>
                <h2>창작자 협업, 콘텐츠 유통, 정산 자동화를 하나의 스튜디오로 연결합니다</h2>
                </div>
                <p>흩어진 창작자가 팀을 만들고, 작품을 판매하고, 수익을 투명하게 나누는 과정을 하나의 제품 흐름으로 설계한 멀티 IP 플랫폼입니다.</p>
              </div>
              <div className="feature-grid">
                {featureCards.map((feature) => (
                  <article key={feature.title} className="feature-card">
                    <span>{feature.icon}</span>
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="showcase-section reveal">
              <div className="showcase-copy">
                <p className="kicker">Product Preview</p>
                <h2>팀 결성부터 결제, 감상, 정산까지 한 번에</h2>
                <p>독자는 코인으로 콘텐츠를 열람하고, 창작자는 합의된 지분율대로 정산 내역을 확인합니다. 시각장애인과 저시력자를 위한 고대비 감상 경험도 기본 흐름에 포함됩니다.</p>
              </div>
              <div className="showcase-cards">
                <article className="mock-card matching-mock">
                  <span>Matching</span>
                  <strong>성우 · 일러스트 · 작가 매칭</strong>
                  <div className="avatar-row"><i /><i /><i /><i /></div>
                </article>
                <article className="mock-card settlement-mock">
                  <span>Settlement</span>
                  <strong>결제 즉시 1/N 자동 분배</strong>
                  <div className="mini-donut" />
                </article>
                <article className="mock-card viewer-mock">
                  <span>Access</span>
                  <strong>시각 중심 콘텐츠를 음성·대본 접근성으로 확장</strong>
                  <p>“같은 작품을 더 많은 독자가 즐길 수 있도록.”</p>
                </article>
              </div>
            </section>

            <section className="ecosystem-section reveal">
              <div className="section-head intro-head">
                <div>
                  <p className="kicker">For whom</p>
                  <h2 className="balanced-korean-title">
                    <span>각자 다른 이유로 필요한 사람들이</span>
                    <span>같은 세계관 안에서 만납니다</span>
                  </h2>
                </div>
                <p>팬덤형 창작 커뮤니티의 감성을 살리면서 소설, 웹툰, 만화, 애니메이션, 오디오드라마를 하나의 협업 IP로 확장할 수 있게 설계했습니다.</p>
              </div>
              <div className="audience-grid">
                {audienceSegments.map((segment, index) => (
                  <article className="audience-card" key={segment.title}>
                    <b>0{index + 1}</b>
                    <span>{segment.label}</span>
                    <h3>{segment.title}</h3>
                    <p>{segment.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="flow-section reveal">
              <div>
                <p className="kicker">How it works</p>
                <h2>결제 한 번이 팀 전체의 정산까지 이어지는 구조</h2>
                <p>단순히 콘텐츠를 올리는 곳이 아니라, 협업의 시작부터 수익 분배까지 하나의 데이터 흐름으로 묶습니다.</p>
              </div>
              <div className="flow-rail">
                {serviceFlow.map((item, index) => (
                  <div key={item}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="premium-section reveal">
              <div className="section-head intro-head">
                <div>
                  <p className="kicker">Partner System</p>
                  <h2>성공한 창작팀이 떠나지 않도록 수수료를 낮추는 락인 전략</h2>
                </div>
                <p>일반 팀은 낮은 진입 장벽으로 시작하고, 성장한 팀은 파트너 등급으로 더 좋은 조건을 받습니다.</p>
              </div>
              <div className="plan-grid">
                {partnerPlans.map((plan) => (
                  <article className="plan-card" key={plan.name}>
                    <span>{plan.target}</span>
                    <h3>{plan.name}</h3>
                    <strong>{plan.fee}</strong>
                    <p>플랫폼 수수료</p>
                    {plan.perks.map((perk) => <em key={perk}>{perk}</em>)}
                  </article>
                ))}
              </div>
            </section>

            <section className="universe-premium-card reveal">
              <div>
                <p className="kicker">Universe Premium</p>
                <h2>월 7,900코인으로 광고 없이 보고, 매달 보너스 코인까지 받는 구독 서비스</h2>
                <p>홈에서 바로 이해되는 독자용 멤버십 상품입니다. 작품 페이지 광고 제거, 팬덤형 콘텐츠 선공개, 보너스 코인을 묶어 유튜브 프리미엄처럼 명확한 구독 가치를 제공합니다.</p>
                <button onClick={openPayment}><Sparkles size={17} /> 프리미엄 구독 살펴보기</button>
              </div>
              <div>
                <strong>7,900 Coin</strong>
                {universePremiumBenefits.map((benefit) => <span key={benefit}><CheckCircle2 size={16} /> {benefit}</span>)}
              </div>
            </section>

            <section className="timeline-section reveal">
              <div>
                <p className="kicker">Growth Roadmap</p>
                <h2>프로토타입 이후에도 확장 가능한 실행 계획</h2>
              </div>
              <div className="timeline-list">
                {growthTimeline.map((item) => (
                  <article key={item.year}>
                    <span>{item.year}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mission-section reveal">
              <div>
                <p className="kicker">ESG Mission</p>
                <h2>시장성과 사회적 가치를 동시에 잡는 멀티 IP 플랫폼</h2>
                <p>소설과 웹툰은 창작의 시작점이 되고, 오디오 버전과 배리어프리 감상 기능은 더 많은 사용자가 같은 작품을 즐기게 만드는 확장 채널이 됩니다.</p>
              </div>
              <div className="roadmap-card">
                <Rocket size={26} />
                <strong>3주 MVP 추진 계획</strong>
                {roadmapItems.map((item) => <span key={item}>{item}</span>)}
              </div>
            </section>

            <section className="final-cta reveal">
              <span>Everything you create has a voice</span>
              <h2>창작자가 모이고, 독자가 듣고, 수익이 공정하게 흐르는 오디오 유니버스</h2>
              <p>이제 매칭, 작품 결제, 정산, 고객센터 화면에서 실제 MVP 흐름을 확인해보세요.</p>
              <div>
                <button className="primary-button" onClick={() => navigate("matching")}><Users size={18} /> 매칭 화면 보기</button>
                <button className="ghost-button" onClick={openPayment}><Coins size={18} /> 결제창 열기</button>
              </div>
            </section>
          </div>
        )}

        {activePage === "discover" && <section className="section discover-page page-panel">
          <div className="discover-hero">
            <div>
              <p className="kicker">Multi Content Library</p>
              <h2>소설, 웹툰, 만화, 애니메이션, 오디오드라마를 장르별로 골라보세요</h2>
              <p>독자는 웹툰 플랫폼처럼 원하는 장르와 콘텐츠 형식을 고르고, 창작팀은 하나의 IP를 글·그림·소리·영상으로 확장해 유통할 수 있습니다.</p>
            </div>
            <div className="featured-work">
              <span><Flame size={15} /> 실시간 인기</span>
              <strong>{readerWorks[0].title}</strong>
              <p>{readerWorks[0].tagline}</p>
              <button onClick={() => openWorkPayment(readerWorks[0].id)}><Coins size={17} /> {formatCoins(readerWorks[0].priceCoins)} 열람</button>
            </div>
          </div>

          <section className="content-format-grid" aria-label="콘텐츠 형식별 협업 모델">
            {contentFormatCards.map((item) => (
              <article className="content-format-card" key={item.title}>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </section>

          <section className="ranking-section">
            <div className="section-head">
              <div>
                <p className="kicker">Ranking</p>
                <h2>지금 가장 많이 보는 작품과 장르별 TOP 차트</h2>
              </div>
              <p>감상 수, 평점, 회차 활동성을 합산해 만든 데모 랭킹입니다. 카드 클릭 시 작품 상세와 댓글/리뷰로 바로 연결됩니다.</p>
            </div>
            <div className="ranking-layout">
              <article className="overall-ranking-card">
                <div className="ranking-card-head">
                  <span>전체 차트</span>
                  <small>오늘의 인기 순위</small>
                </div>
                {rankedReaderWorks.slice(0, 8).map((work, index) => (
                  <button
                    className={index < 3 ? "podium" : ""}
                    key={work.id}
                    onClick={() => {
                      setSelectedWork(work);
                      setReviewWorkId(work.id);
                    }}
                  >
                    <b>{index + 1}</b>
                    <img src={work.coverImage} alt="" />
                    <div>
                      <strong>{work.title}</strong>
                      <small>{work.format} · {work.genre} · ★ {work.rating}</small>
                    </div>
                    <em>{index === 0 ? "HOT" : index % 3 === 0 ? "NEW" : `▲ ${index + 1}`}</em>
                  </button>
                ))}
              </article>

              <div className="genre-ranking-grid">
                {genreRankings.map((ranking) => (
                  <article key={ranking.genre}>
                    <span>{ranking.genre}</span>
                    {ranking.works.map((work, index) => (
                      <button
                        key={work.id}
                        onClick={() => {
                          setSelectedWork(work);
                          setReviewWorkId(work.id);
                        }}
                      >
                        <b>{index + 1}</b>
                        <div>
                          <strong>{work.title}</strong>
                          <small>{work.format} · {work.listeners} · ★ {work.rating}</small>
                        </div>
                      </button>
                    ))}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="recommend-strip" ref={librarySectionRef} id="reader-library">
            <div className="section-head">
              <div>
                <p className="kicker">Recommended</p>
                <h2>{readerFilters.length === 0 ? "전체 추천작" : `${readerFilters.join(" · ")} 추천작`}</h2>
              </div>
              <p>선택한 장르와 검색어에 맞춰 독자용 작품 카드가 바뀝니다.</p>
            </div>
            <div className="library-shelf">
              <article>
                <div>
                  <span>Continue</span>
                  <strong>최근 본 작품</strong>
                  <p>{recentWorks.length > 0 ? `${recentWorks.length}개 작품 이어보기 가능` : "작품 상세를 열면 자동 저장돼요"}</p>
                </div>
                <div className="library-cover-stack recent-stack">
                  {(recentWorks.length > 0 ? recentWorks : readerWorks.slice(1, 4)).slice(0, 3).map((work) => (
                    <img src={work.coverImage} alt="" key={work.id} />
                  ))}
                </div>
                <button onClick={() => openReaderLibrary("recent")}>
                  최근 본 작품 보기
                </button>
              </article>
              <article>
                <div>
                  <span>Purchased</span>
                  <strong>결제한 작품</strong>
                  <p>{purchasedWorks.length > 0 ? `${purchasedWorks.length}개 열람권 보유` : "아직 결제한 작품이 없어요"}</p>
                </div>
                <div className="library-cover-stack">
                  {(purchasedWorks.length > 0 ? purchasedWorks : readerWorks.slice(0, 3)).slice(0, 3).map((work) => (
                    <img src={work.coverImage} alt="" key={work.id} />
                  ))}
                </div>
                <button onClick={() => {
                  if (!token) {
                    setAuthMode("login");
                    return;
                  }
                  openReaderLibrary("purchased");
                }}>
                  결제한 작품만 보기
                </button>
              </article>
              <article>
                <div>
                  <span>Scrap</span>
                  <strong>스크랩 보관함</strong>
                  <p>{scrappedWorks.length > 0 ? `${scrappedWorks.length}개 작품 저장됨` : "하트를 누르면 여기에 저장돼요"}</p>
                </div>
                <div className="library-cover-stack heart-stack">
                  {(scrappedWorks.length > 0 ? scrappedWorks : readerWorks.slice(3, 6)).slice(0, 3).map((work) => (
                    <img src={work.coverImage} alt="" key={work.id} />
                  ))}
                </div>
                <button onClick={() => {
                  if (!token) {
                    setAuthMode("login");
                    return;
                  }
                  openReaderLibrary("scrapped");
                }}>
                  스크랩만 보기
                </button>
              </article>
            </div>
            <div className="reader-toolbar recommend-toolbar">
              <div className="library-tabs" aria-label="내 작품 보관함 필터">
                {libraryViewItems.map((item) => {
                  const count =
                    item.id === "recent"
                      ? recentWorkIds.length
                      : item.id === "purchased"
                        ? purchasedWorkIds.length
                        : item.id === "scrapped"
                          ? scrappedWorkIds.length
                          : readerWorks.length;
                  return (
                    <button
                      key={item.id}
                      className={readerLibraryView === item.id ? "active" : ""}
                      onClick={() => {
                      if ((item.id === "purchased" || item.id === "scrapped") && !token) {
                        setAuthMode("login");
                        return;
                      }
                        setReaderLibraryView(item.id);
                      }}
                    >
                      {item.id === "recent" && <RefreshCw size={15} />}
                      {item.id === "purchased" && <BookOpen size={15} />}
                      {item.id === "scrapped" && <Heart size={15} />}
                      {item.label}
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
              <label className="matching-search">
                <Search size={18} />
                <input
                  value={readerSearch}
                  onChange={(event) => setReaderSearch(event.target.value)}
                  placeholder="예: 웹툰 로맨스, 소설 판타지, 만화 스릴러"
                  type="search"
                />
              </label>
              <div className="reader-filter-groups" aria-label="작품 형식과 장르 필터">
                <div>
                  <span>콘텐츠 형식</span>
                  <div className="genre-filter reader-genre-filter">
                    {readerFormatFilters.map((format) => (
                      <button
                        key={format}
                        className={(format === "전체" ? readerFilters.length === 0 : readerFilters.includes(format)) ? "active" : ""}
                        onClick={() => toggleReaderFilter(format)}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span>장르</span>
                  <div className="genre-filter reader-genre-filter">
                    {readerGenreFilters.map((genre) => (
                      <button
                        key={genre}
                        className={readerFilters.includes(genre) ? "active" : ""}
                        onClick={() => toggleReaderFilter(genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="active-filter-hint">
                {readerFilters.length > 0
                  ? `${readerFilters.join(" + ")} 조건을 모두 만족하는 작품만 표시 중`
                  : "여러 필터를 동시에 선택하거나 검색창에 '웹툰 로맨스'처럼 입력해보세요."}
              </p>
            </div>
            <div className="reader-work-grid">
              {filteredReaderWorks.map((work) => (
                <article className={`reader-work-card ${work.tone}`} key={work.id}>
                  <div className="reader-cover">
                    <img src={work.coverImage} alt={`${work.title} 커버`} />
                    <span>{work.badge}</span>
                    {hasAudioExperience(work) && (
                      <em className="audio-work-badge"><Headphones size={14} /> {getAudioExperienceLabel(work)}</em>
                    )}
                    <strong>{work.format}</strong>
                    <button
                      className={`scrap-button ${scrappedWorkIds.includes(work.id) ? "active" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleScrap(work.id);
                      }}
                      aria-label={scrappedWorkIds.includes(work.id) ? `${work.title} 스크랩 해제` : `${work.title} 스크랩`}
                    >
                      <Heart size={17} fill={scrappedWorkIds.includes(work.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="reader-work-body">
                    <span>{work.format} · {work.subGenre}</span>
                    <h3>{work.title}</h3>
                    <p>{work.tagline}</p>
                    <div className="reader-meta">
                      <b><Star size={14} /> {work.rating}</b>
                      <b>{work.listeners} 감상</b>
                      <b>{work.episodes}화</b>
                    </div>
                    <div className="work-contributors">
                      <span>참여 창작자</span>
                      <div>
                        {work.participantUserIds
                          .map((userId) => creators.find((creator) => creator.userId === userId))
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((creator) => (
                            <button key={creator!.id} onClick={() => setSelectedCreator(creator!)}>
                              <i>{creator!.displayName.slice(0, 1)}</i>
                              <b>{creator!.displayName}</b>
                              <em>{roleLabels[creator!.primaryRole]}</em>
                            </button>
                          ))}
                      </div>
                    </div>
                    <div className="chips">{work.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <div className="reader-actions">
                      {purchasedWorkIds.includes(work.id) ? (
                        <button className="ghost-button compact purchased-badge"><CheckCircle2 size={16} /> 결제 완료</button>
                      ) : (
                        <button className="primary-button compact" onClick={() => openWorkPayment(work.id)}><Coins size={16} /> {formatCoins(work.priceCoins)}</button>
                      )}
                      <button
                        className="ghost-button compact"
                        onClick={() => {
                          setSelectedWork(work);
                          setReviewWorkId(work.id);
                        }}
                      >
                        <BookOpen size={16} /> 상세/리뷰
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {filteredReaderWorks.length === 0 && (
              <div className="empty-matching">
                <BookOpen size={24} />
                <strong>조건에 맞는 작품이 없어요</strong>
                <p>다른 장르를 누르거나 검색어를 바꿔보세요.</p>
              </div>
            )}
          </section>

          <section className="creator-discovery-strip">
            <div className="section-head">
              <div>
                <p className="kicker">Creator Search</p>
                <h2>작품에 참여한 작가, 성우, 그림 작가를 찾아보세요</h2>
              </div>
              <p>이름, 직군, 작품명, 장르를 검색해서 창작자 프로필을 열고 후원이나 구독으로 연결할 수 있습니다.</p>
            </div>
            <div className="creator-search-toolbar">
              <label className="matching-search">
                <Search size={18} />
                <input
                  value={discoverCreatorSearch}
                  onChange={(event) => setDiscoverCreatorSearch(event.target.value)}
                  placeholder="예: 성우 미스터리, 작가 로맨스, 렌카 웹툰"
                  type="search"
                />
              </label>
              <div className="role-tabs compact-role-tabs">
                {roleFilterItems.map((item) => (
                  <button key={item} className={discoverCreatorRole === item ? "active" : ""} onClick={() => setDiscoverCreatorRole(item)}>
                    {item === "ALL" ? "전체" : roleLabels[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="discover-creator-grid">
              {discoverCreators.slice(0, 6).map((creator) => {
                const joinedWorks = readerWorks.filter((work) => work.participantUserIds.includes(creator.userId));

                return (
                  <article key={creator.id}>
                    <div className="discover-creator-avatar">{creator.displayName.slice(0, 1)}</div>
                    <span>{roleLabels[creator.primaryRole]}</span>
                    <strong>{creator.displayName}</strong>
                    <p>{creator.headline}</p>
                    <div>
                      {joinedWorks.slice(0, 2).map((work) => <em key={work.id}>{work.title}</em>)}
                    </div>
                    <button onClick={() => setSelectedCreator(creator)}>프로필 · 후원 보기</button>
                  </article>
                );
              })}
            </div>
          </section>

        </section>}

        {activePage === "studio" && <section className="section studio-page page-panel">
          <div className="studio-hero">
            <div>
              <p className="kicker">Creator Studio</p>
              <h2>내 채널, 작품, 팀원, 수익을 한눈에 관리하는 창작자 작업실</h2>
              <p>
                창작자는 프로필을 공개하고, 대표작을 정리하고, 팀원을 초대하고, 멤버십과 정산 상태까지 한 화면에서 관리할 수 있습니다.
                이 페이지는 Creator Universe의 창작자 홈이자 작품 운영 콘솔입니다.
              </p>
              <div className="studio-hero-actions">
                <button className="primary-button" onClick={() => { setIsCreatorProfileFormOpen(true); navigate("matching"); }}><UserPlus size={18} /> 매칭 프로필 준비</button>
                <button className="ghost-button" onClick={() => navigate("settlement")}><Split size={18} /> 정산 설정으로 이동</button>
              </div>
            </div>
            <div className="studio-status-card">
              <span>Studio Status</span>
              <strong>{myCreatorProfile ? "창작자 프로필 공개 중" : "프로필 등록 대기"}</strong>
              <p>{myCreatorProfile ? myCreatorProfile.headline : "매칭 보드에 프로필을 올리면 팀원이 내 스튜디오로 합류할 수 있어요."}</p>
            </div>
          </div>

          <section className="studio-command-center">
            <article className="studio-profile-score">
              <div className="studio-score-ring" style={{ "--score": `${studioProfileCompletion.percent}%` } as never}>
                <strong>{studioProfileCompletion.percent}%</strong>
                <span>Profile</span>
              </div>
              <div>
                <p className="kicker">Creator Readiness</p>
                <h3>프로필 완성도</h3>
                <p>팀원이 신뢰하고 제안할 수 있도록 공개 정보와 대표작을 채워주세요.</p>
                <div className="studio-checklist">
                  {studioProfileCompletion.items.map((item) => (
                    <span className={item.done ? "done" : ""} key={item.label}>
                      <CheckCircle2 size={14} /> {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <article className="studio-channel-preview">
              <div className="studio-channel-avatar">{(myCreatorProfile?.displayName ?? user?.displayName ?? "C").slice(0, 1)}</div>
              <div>
                <span>{myCreatorProfile ? roleLabels[myCreatorProfile.primaryRole] : "창작자"}</span>
                <strong>{myCreatorProfile?.displayName ?? user?.displayName ?? "내 창작자 채널"}</strong>
                <p>{myCreatorProfile?.portfolioSummary ?? "대표작, 포트폴리오, 멤버십을 연결하면 독자와 팀원이 보는 창작자 채널이 완성됩니다."}</p>
              </div>
              <div className="studio-channel-stats">
                <b>{myCreatorProfile?.followerCount.toLocaleString("ko-KR") ?? 0}</b><span>팔로워</span>
                <b>{myCreatorProfile?.responseRate ?? 0}%</b><span>응답률</span>
                <b>{myStudioWorks.length}</b><span>대표작</span>
              </div>
            </article>

            <article className="studio-revenue-snapshot">
              <p className="kicker">Revenue Snapshot</p>
              <h3>이번 달 창작 수익 흐름</h3>
              <div>
                <span>예상 정산</span>
                <strong>{formatCoins(settlementPreview.mySettlementAmount)}</strong>
              </div>
              <div>
                <span>지갑 잔액</span>
                <strong>{formatCoins(wallet ?? 0)}</strong>
              </div>
              <button onClick={() => navigate("wallet")}><Wallet size={15} /> 지갑으로 이동</button>
            </article>
          </section>

          <div className="studio-kpi-grid">
            <article><BookOpen size={22} /><span>대표 작품</span><strong>{myStudioWorks.length || 3}개</strong><p>창작자 채널에 보여줄 대표작과 참여작을 관리합니다.</p></article>
            <article><Users size={22} /><span>매칭 제안</span><strong>{matchProposalInboxItems.filter((item) => item.proposal.status === "PENDING").length}건</strong><p>지분율 조건을 확인하고 팀 합류 여부를 결정합니다.</p></article>
            <article><Split size={22} /><span>기본 지분</span><strong>40 · 30 · 30</strong><p>팀장 40%, 팀원 30% 프리셋을 적용할 수 있습니다.</p></article>
            <article><Rocket size={22} /><span>채널 준비</span><strong>{studioProfileCompletion.percent}%</strong><p>프로필, 대표작, 포트폴리오 기준의 준비 상태입니다.</p></article>
          </div>

          <section className="studio-channel-dashboard">
            <div className="section-head">
              <div>
                <p className="kicker">Creator Channel</p>
                <h2>내 창작자 홈 구성</h2>
              </div>
              <p>픽시브식 포트폴리오, 포스타입식 멤버십, 팀 프로젝트 정산을 한 화면으로 묶은 창작자 채널 영역입니다.</p>
            </div>
            <div className="studio-channel-grid">
              <article className="studio-feature-work">
                <span>대표작</span>
                <strong>{myStudioWorks[0]?.title ?? "대표작을 아직 연결하지 않았어요"}</strong>
                <p>{myStudioWorks[0]?.tagline ?? "작품 상세에서 참여 창작자로 연결되면 이 영역에 대표작이 표시됩니다."}</p>
                <button onClick={() => navigate("discover")}><BookOpen size={15} /> 작품 관리</button>
              </article>
              <article>
                <span>멤버십</span>
                <strong>{premiumSubscription.isActive ? "프리미엄 구독중" : "팬 멤버십 설계 필요"}</strong>
                <p>러프, 짧은 글, 보이스 샘플, BGM 루프를 구독자 전용 포스트로 묶을 수 있습니다.</p>
                <button onClick={() => setIsAccountModalOpen(true)}><Sparkles size={15} /> 구독 관리</button>
              </article>
              <article>
                <span>다음 할 일</span>
                <strong>{studioProfileCompletion.items.find((item) => !item.done)?.label ?? "채널 기본 준비 완료"}</strong>
                <p>완성도가 높을수록 매칭 보드와 작품 상세에서 더 신뢰감 있게 보입니다.</p>
                <button onClick={() => { setIsCreatorProfileFormOpen(true); navigate("matching"); }}><UserPlus size={15} /> 프로필 보강</button>
              </article>
            </div>
          </section>

          <section className="studio-publish-editor">
            <div className="section-head">
              <div>
                <p className="kicker">Publishing Editor</p>
                <h2>작품/회차 발행 에디터</h2>
              </div>
              <p>작품 기본 정보, 회차 제목, 가격, 공개 방식, 접근성 대본 메모를 한 번에 정리하고 독자에게 보일 화면을 바로 확인합니다.</p>
            </div>

            <div className="studio-editor-workspace">
              <form className="studio-form studio-publish-form" onSubmit={submitStudioWorkDraft}>
                <div className="studio-form-section">
                  <span>작품 정보</span>
                  <label>작품 제목
                    <input
                      name="title"
                      required
                      value={studioDraft.title}
                      onChange={(event) => updateStudioDraft("title", event.target.value)}
                    />
                  </label>
                  <label>콘텐츠 형식
                    <select
                      name="format"
                      value={studioDraft.format}
                      onChange={(event) => updateStudioDraft("format", event.target.value)}
                    >
                      {readerFormatFilters.filter((item) => item !== "전체").map((format) => <option key={format}>{format}</option>)}
                    </select>
                  </label>
                  <label>대표 장르
                    <select
                      name="genre"
                      value={studioDraft.genre}
                      onChange={(event) => updateStudioDraft("genre", event.target.value)}
                    >
                      {readerGenreFilters.map((genre) => <option key={genre}>{genre}</option>)}
                    </select>
                  </label>
                  <label>회차 제목
                    <input
                      name="episodeTitle"
                      required
                      value={studioDraft.episodeTitle}
                      onChange={(event) => updateStudioDraft("episodeTitle", event.target.value)}
                    />
                  </label>
                  <label className="wide">작품 소개
                    <textarea
                      name="synopsis"
                      required
                      value={studioDraft.synopsis}
                      onChange={(event) => updateStudioDraft("synopsis", event.target.value)}
                    />
                  </label>
                </div>

                <div className="studio-form-section">
                  <span>발행 설정</span>
                  <label>공개 방식
                    <select
                      name="accessType"
                      value={studioDraft.accessType}
                      onChange={(event) => updateStudioDraft("accessType", event.target.value)}
                    >
                      <option>무료 공개</option>
                      <option>코인 열람</option>
                      <option>구독자 선공개</option>
                      <option>멤버십 전용</option>
                    </select>
                  </label>
                  <label>열람 가격
                    <input
                      name="priceCoins"
                      min={0}
                      step={100}
                      type="number"
                      value={studioDraft.priceCoins}
                      onChange={(event) => updateStudioDraft("priceCoins", Number(event.target.value))}
                    />
                  </label>
                  <label>발행 상태
                    <select
                      name="publishMode"
                      value={studioDraft.publishMode}
                      onChange={(event) => updateStudioDraft("publishMode", event.target.value)}
                    >
                      <option>초안 저장</option>
                      <option>예약 발행</option>
                      <option>즉시 공개</option>
                      <option>팀 검수 대기</option>
                    </select>
                  </label>
                  <label>예약 시간
                    <input
                      name="scheduledAt"
                      value={studioDraft.scheduledAt}
                      onChange={(event) => updateStudioDraft("scheduledAt", event.target.value)}
                    />
                  </label>
                  <label className="wide">무료 미리보기 문구
                    <textarea
                      name="previewText"
                      value={studioDraft.previewText}
                      onChange={(event) => updateStudioDraft("previewText", event.target.value)}
                    />
                  </label>
                  <label className="wide">업로드/접근성 메모
                    <textarea
                      name="uploadMemo"
                      value={studioDraft.uploadMemo}
                      onChange={(event) => updateStudioDraft("uploadMemo", event.target.value)}
                    />
                  </label>
                </div>

                <button className="primary-button" type="submit"><Sparkles size={17} /> 발행 초안 저장</button>
              </form>

              <aside className="studio-publish-preview">
                <div className="publish-preview-cover">
                  <span>{studioDraft.format}</span>
                  <strong>{studioDraft.title || "작품 제목"}</strong>
                  <em>{studioDraft.genre}</em>
                </div>
                <div className="publish-preview-copy">
                  <span>{studioDraft.publishMode} · {studioDraft.accessType}</span>
                  <h3>{studioDraft.episodeTitle || "회차 제목"}</h3>
                  <p>{studioDraft.synopsis || "작품 소개를 입력하면 독자 카드에 보일 문장이 표시됩니다."}</p>
                  <div className="publish-preview-meta">
                    <b>{studioDraft.accessType === "무료 공개" ? "무료" : formatCoins(studioDraft.priceCoins)}</b>
                    <b>{studioDraft.scheduledAt}</b>
                  </div>
                </div>
                <div className="publish-preview-script">
                  <span>무료 미리보기</span>
                  <p>{studioDraft.previewText}</p>
                </div>
                <div className="publish-checklist">
                  <div>
                    <strong>발행 준비도</strong>
                    <b>{studioPublishChecklist.percent}%</b>
                  </div>
                  {studioPublishChecklist.items.map((item) => (
                    <p className={item.done ? "done" : ""} key={item.label}>
                      <CheckCircle2 size={16} />
                      {item.label}
                    </p>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <div className="studio-layout">
            <section className="studio-work-form-card compact-studio-card">
              <div className="section-head compact-head">
                <div>
                  <p className="kicker">Quick Work</p>
                  <h3>빠른 작품 초안</h3>
                </div>
                <p>간단한 초안만 빠르게 남기고 싶을 때 사용하는 축약 폼입니다.</p>
              </div>
              <form className="studio-form" onSubmit={submitStudioWorkDraft}>
                <label>작품 제목<input name="title" required placeholder="예: 네온 별자리 탐정단" /></label>
                <label>콘텐츠 형식
                  <select name="format" defaultValue="웹툰">
                    {readerFormatFilters.filter((item) => item !== "전체").map((format) => <option key={format}>{format}</option>)}
                  </select>
                </label>
                <label>대표 장르
                  <select name="genre" defaultValue="판타지">
                    {readerGenreFilters.map((genre) => <option key={genre}>{genre}</option>)}
                  </select>
                </label>
                <label className="wide">작품 소개<textarea name="synopsis" required placeholder="작품의 핵심 설정, 독자에게 보여줄 매력, 필요한 팀원을 적어주세요." /></label>
                <button className="primary-button" type="submit"><Sparkles size={17} /> 작품 초안 저장</button>
              </form>
            </section>

            <section className="studio-work-form-card compact-studio-card">
              <div className="section-head compact-head">
                <div>
                  <p className="kicker">Quick Episode</p>
                  <h3>빠른 회차 메모</h3>
                </div>
                <p>작품별 회차 아이디어나 업로드 준비물을 짧게 저장합니다.</p>
              </div>
              <form className="studio-form" onSubmit={submitStudioEpisode}>
                <label>연결 작품
                  <select name="workId" defaultValue={readerWorks[0].id}>
                    {readerWorks.slice(0, 6).map((work) => <option value={work.id} key={work.id}>{work.title}</option>)}
                  </select>
                </label>
                <label>회차 제목<input name="episodeTitle" required placeholder="예: 2화. 사라진 목소리" /></label>
                <label>공개 방식
                  <select name="accessType" defaultValue="유료">
                    <option>무료</option>
                    <option>유료</option>
                    <option>구독자 선공개</option>
                  </select>
                </label>
                <label className="wide">업로드 메모<textarea name="uploadMemo" placeholder="원고, 콘티, 음성 파일, 대본 싱크 등 업로드할 자료를 적어주세요." /></label>
                <button className="primary-button" type="submit"><BookOpen size={17} /> 회차 초안 저장</button>
              </form>
            </section>
          </div>

          <section className="studio-fan-commerce">
            <div className="section-head">
              <div>
                <p className="kicker">Fan Commerce</p>
                <h2>팬 멤버십과 유료 포스트 운영</h2>
              </div>
              <p>픽시브 FANBOX처럼 러프, 이미지팩, 보이스 샘플, 제작노트를 코인 열람 또는 구독자 전용 콘텐츠로 발행하는 수익화 콘솔입니다.</p>
            </div>

            <div className="fan-commerce-grid">
              <form className="fan-post-editor-card" onSubmit={submitStudioFanPost}>
                <div className="fan-editor-head">
                  <span><Heart size={18} /> Fan Post Editor</span>
                  <strong>팬 전용 포스트 초안</strong>
                </div>
                <label>포스트 제목
                  <input
                    name="fanPostTitle"
                    value={studioFanPostDraft.title}
                    onChange={(event) => updateStudioFanPostDraft("title", event.target.value)}
                  />
                </label>
                <div className="fan-editor-row">
                  <label>콘텐츠 유형
                    <select
                      value={studioFanPostDraft.postType}
                      onChange={(event) => updateStudioFanPostDraft("postType", event.target.value)}
                    >
                      <option>이미지팩</option>
                      <option>작업노트</option>
                      <option>보이스 샘플</option>
                      <option>BGM 루프</option>
                      <option>외전 원고</option>
                    </select>
                  </label>
                  <label>공개 방식
                    <select
                      name="fanPostAccess"
                      value={studioFanPostDraft.accessType}
                      onChange={(event) => updateStudioFanPostDraft("accessType", event.target.value)}
                    >
                      <option>무료 공개</option>
                      <option>코인 열람</option>
                      <option>구독자 전용</option>
                    </select>
                  </label>
                </div>
                <div className="fan-editor-row">
                  <label>연결 티어
                    <select
                      value={studioFanPostDraft.tierName}
                      onChange={(event) => updateStudioFanPostDraft("tierName", event.target.value)}
                    >
                      {creatorMembershipPlans.map((plan) => <option key={plan.name}>{plan.name}</option>)}
                    </select>
                  </label>
                  <label>개별 열람 가격
                    <input
                      min={0}
                      step={100}
                      type="number"
                      value={studioFanPostDraft.priceCoins}
                      onChange={(event) => updateStudioFanPostDraft("priceCoins", Number(event.target.value))}
                    />
                  </label>
                </div>
                <label>팬에게 보일 설명
                  <textarea
                    value={studioFanPostDraft.summary}
                    onChange={(event) => updateStudioFanPostDraft("summary", event.target.value)}
                  />
                </label>
                <label>운영 메모
                  <textarea
                    value={studioFanPostDraft.releaseNote}
                    onChange={(event) => updateStudioFanPostDraft("releaseNote", event.target.value)}
                  />
                </label>
                <button className="primary-button" type="submit"><Sparkles size={17} /> 팬 포스트 초안 저장</button>
              </form>

              <aside className="fan-commerce-preview">
                <article className="fan-post-preview-card">
                  <span>{studioFanPostDraft.postType} · {studioFanPostDraft.accessType}</span>
                  <strong>{studioFanPostDraft.title}</strong>
                  <p>{studioFanPostDraft.summary}</p>
                  <div>
                    <b>{studioFanPostDraft.accessType === "무료 공개" ? "무료" : formatCoins(studioFanPostDraft.priceCoins)}</b>
                    <em>{studioFanPostDraft.tierName}</em>
                  </div>
                </article>

                <div className="fan-tier-preview">
                  {creatorMembershipPlans.map((plan) => (
                    <article className={studioFanPostDraft.tierName === plan.name ? "active" : ""} key={plan.name}>
                      <span>{plan.name}</span>
                      <strong>{formatCoins(plan.price)} / 월</strong>
                      <p>{plan.benefits.slice(0, 2).join(" · ")}</p>
                    </article>
                  ))}
                </div>

                <div className="fan-commerce-checklist">
                  <div>
                    <strong>수익화 준비도</strong>
                    <b>{studioFanPostChecklist.percent}%</b>
                  </div>
                  {studioFanPostChecklist.items.map((item) => (
                    <p className={item.done ? "done" : ""} key={item.label}>
                      <CheckCircle2 size={16} />
                      {item.label}
                    </p>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <section className="studio-growth-analytics">
            <div className="section-head">
              <div>
                <p className="kicker">Growth Analytics</p>
                <h2>창작자 성장 인사이트</h2>
              </div>
              <p>작품 반응, 팬 구독 준비도, 코인 판매 흐름을 한 화면에서 보고 다음 운영 액션을 결정합니다.</p>
            </div>

            <div className="growth-metric-grid">
              {studioGrowthInsights.metrics.map((metric) => (
                <article key={metric.label}>
                  <span>{metric.icon}</span>
                  <div>
                    <small>{metric.label}</small>
                    <strong>{metric.value}</strong>
                    <p>{metric.detail}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="growth-analytics-layout">
              <article className="growth-funnel-card">
                <div className="growth-card-head">
                  <span><Flame size={17} /> Reader Funnel</span>
                  <strong>독자 전환 흐름</strong>
                </div>
                <div className="growth-funnel-list">
                  {studioGrowthInsights.funnel.map((item) => (
                    <div key={item.label}>
                      <div>
                        <b>{item.label}</b>
                        <span>{item.rate}%</span>
                      </div>
                      <i><em style={{ width: `${item.rate}%` }} /></i>
                      <small>{item.caption}</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="growth-action-card">
                <div className="growth-card-head">
                  <span><Rocket size={17} /> Next Actions</span>
                  <strong>이번 주 추천 액션</strong>
                </div>
                <div className="growth-action-list">
                  {studioGrowthInsights.actions.map((action, index) => (
                    <button key={action} onClick={() => setCommunityMessage(action)}>
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <span>{action}</span>
                    </button>
                  ))}
                </div>
              </article>

              <article className="growth-signal-card">
                <span><Bell size={17} /> Signal</span>
                <strong>{premiumSubscription.isActive ? "구독 혜택 운영 중" : "팬 구독 상품을 더 노출해보세요"}</strong>
                <p>
                  작품 상세에서 창작자 프로필 클릭, 스크랩, 결제 흐름을 묶으면 포스타입형 팬덤과 크몽형 협업 문의를 동시에 키울 수 있습니다.
                </p>
                <button onClick={() => setIsNotificationOpen(true)}>알림/팬 반응 보기</button>
              </article>
            </div>
          </section>

          <section className="studio-accessibility-lab">
            <div className="section-head">
              <div>
                <p className="kicker">Barrier-free QA</p>
                <h2>배리어프리 접근성 검수 센터</h2>
              </div>
              <p>오디오드라마, 웹툰, 소설을 발행하기 전에 대본 싱크, 고대비, 스크린리더, 대체 텍스트를 점검해 모두가 감상 가능한 상태로 만듭니다.</p>
            </div>

            <div className="accessibility-lab-layout">
              <article className="accessibility-score-card">
                <span><ShieldCheck size={18} /> Accessibility Score</span>
                <strong>{studioAccessibilityChecklist.percent}%</strong>
                <p>{studioAccessibilityChecklist.status} · {studioAccessibilityChecklist.doneCount}/{studioAccessibilityChecklist.items.length}개 항목 통과</p>
                <div className="accessibility-ring" style={{ "--accessibility-score": `${studioAccessibilityChecklist.percent}%` } as never}>
                  <b>{studioAccessibilityChecklist.status}</b>
                </div>
              </article>

              <div className="accessibility-check-grid">
                {studioAccessibilityChecklist.items.map((item) => (
                  <article className={item.done ? "done" : ""} key={item.label}>
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </article>
                ))}
              </div>

              <form className="accessibility-audit-form" onSubmit={(event) => { event.preventDefault(); saveAccessibilityAudit(); }}>
                <div className="fan-editor-head">
                  <span><Headphones size={18} /> QA Controls</span>
                  <strong>발행 전 검수 입력</strong>
                </div>
                <label>대본 싱크 정확도
                  <input
                    max={100}
                    min={0}
                    type="range"
                    value={studioAccessibilityAudit.transcriptSync}
                    onChange={(event) => updateStudioAccessibilityAudit("transcriptSync", Number(event.target.value))}
                  />
                  <em>{studioAccessibilityAudit.transcriptSync}%</em>
                </label>
                <div className="accessibility-form-row">
                  <label>고대비 모드
                    <select
                      value={studioAccessibilityAudit.contrastMode}
                      onChange={(event) => updateStudioAccessibilityAudit("contrastMode", event.target.value)}
                    >
                      <option>고대비 통과</option>
                      <option>색 대비 보강 필요</option>
                    </select>
                  </label>
                  <label>스크린리더
                    <select
                      value={studioAccessibilityAudit.screenReader}
                      onChange={(event) => updateStudioAccessibilityAudit("screenReader", event.target.value)}
                    >
                      <option>검수 완료</option>
                      <option>레이블 보강 필요</option>
                    </select>
                  </label>
                </div>
                <div className="accessibility-form-row">
                  <label>오디오 음량
                    <select
                      value={studioAccessibilityAudit.audioLevel}
                      onChange={(event) => updateStudioAccessibilityAudit("audioLevel", event.target.value)}
                    >
                      <option>권장 범위</option>
                      <option>노멀라이징 필요</option>
                    </select>
                  </label>
                  <label>대체 텍스트
                    <select
                      value={studioAccessibilityAudit.altTextStatus}
                      onChange={(event) => updateStudioAccessibilityAudit("altTextStatus", event.target.value)}
                    >
                      <option>보강 필요</option>
                      <option>작성 완료</option>
                    </select>
                  </label>
                </div>
                <label>검수 메모
                  <textarea
                    value={studioAccessibilityAudit.qaMemo}
                    onChange={(event) => updateStudioAccessibilityAudit("qaMemo", event.target.value)}
                  />
                </label>
                <button className="primary-button" type="submit"><CheckCircle2 size={17} /> 검수 리포트 저장</button>
              </form>
            </div>
          </section>

          <section className="studio-team-board">
            <div className="section-head">
              <div>
                <p className="kicker">Team Builder</p>
                <h2>팀원 초대와 수익 지분 설정</h2>
              </div>
              <p>매칭에서 찾은 창작자를 작품 팀으로 초대하고, 30:30:40 같은 지분율을 사전에 합의하는 영역입니다.</p>
            </div>
            <div className="studio-team-grid">
              {[
                { role: "WRITER", name: "팀장/원작", share: 40, status: "확정" },
                { role: "ILLUSTRATOR", name: "일러스트", share: 30, status: "초대 가능" },
                { role: "VOICE_ACTOR", name: "성우", share: 20, status: "상담 중" },
                { role: "SOUND_DIRECTOR", name: "BGM", share: 10, status: "모집 중" },
              ].map((member) => (
                <article key={member.role}>
                  <span>{roleLabels[member.role]}</span>
                  <strong>{member.name}</strong>
                  <div><b>{member.share}%</b><em>{member.status}</em></div>
                  <button onClick={() => navigate("matching")}><Send size={15} /> 팀원 찾기</button>
                </article>
              ))}
            </div>
            <div className="studio-share-summary">
              <div>
                <span>현재 지분 합계</span>
                <strong>100%</strong>
                <p>팀원이 수락하면 이 비율을 정산 콘솔에 그대로 반영할 수 있습니다.</p>
              </div>
              <button className="primary-button compact" onClick={saveStudioTeamPlan}><CheckCircle2 size={17} /> 팀 구성 저장</button>
            </div>
          </section>

          <section className="studio-portfolio-panel">
            <div className="section-head">
              <div>
                <p className="kicker">Portfolio Manager</p>
                <h2>내 포트폴리오와 공개 상태</h2>
              </div>
              <p>매칭 보드에 노출되는 내 프로필, 작품 참여 이력, 팬 후원 포스트를 스튜디오에서 관리합니다.</p>
            </div>
            <div className="studio-portfolio-grid">
              <article>
                <UserRound size={22} />
                <strong>{myCreatorProfile ? "매칭 프로필 공개 중" : "매칭 프로필 없음"}</strong>
                <p>{myCreatorProfile ? myCreatorProfile.bio : "프로필을 등록하면 팀원 찾기 카드에 표시됩니다."}</p>
                <button onClick={() => { setIsCreatorProfileFormOpen(true); navigate("matching"); }}>프로필 관리</button>
              </article>
              <article>
                <BookOpen size={22} />
                <strong>참여 작품 크레딧</strong>
                <p>{readerWorks.slice(0, 3).map((work) => work.title).join(" · ")}</p>
                <button onClick={() => navigate("discover")}>작품 확인</button>
              </article>
              <article>
                <Coins size={22} />
                <strong>팬 후원/구독 포스트</strong>
                <p>러프, 짤 이미지팩, 보이스 샘플을 유료 포스트로 확장할 수 있습니다.</p>
                <button onClick={() => setCommunityMessage("팬 포스트 작성기는 다음 단계에서 이미지 업로드와 함께 연결하면 좋아요.")}>포스트 준비</button>
              </article>
            </div>
          </section>

          {communityMessage && <p className="community-message studio-message">{communityMessage}</p>}
        </section>}

        {activePage === "matching" && <section className="section matching-page page-panel">
          <div className="matching-hero">
            <div>
              <p className="kicker">Creator Match Board</p>
              <h2>같은 세계관을 만들 팀원을 발견하세요</h2>
              <p>글, 그림, 목소리, BGM 창작자의 대표 작업과 협업 가능 상태를 한눈에 보고 포트폴리오까지 확인할 수 있습니다.</p>
              <div className="matching-hero-actions">
                <button
                  className="primary-button compact"
                  onClick={() => {
                    if (!token) {
                      setAuthMode("login");
                      return;
                    }
                    setIsCreatorProfileFormOpen((value) => !value);
                  }}
                >
                  <UserPlus size={16} /> 내 매칭 프로필 올리기
                </button>
                <button className="ghost-button compact" onClick={() => openCreatorMessenger()}>
                  <MessageCircle size={16} /> 내 채팅방 보기
                </button>
              </div>
            </div>
            <div className="matching-stats">
              <div><strong>{creators.length}</strong><span>활동 크리에이터</span></div>
              <div><strong>0원</strong><span>초기 매칭 수수료</span></div>
              <div><strong>1/N</strong><span>정산 자동화</span></div>
            </div>
          </div>

          {isCreatorProfileFormOpen && (
            <form className="creator-profile-publisher" onSubmit={(event) => void submitCreatorProfile(event)}>
              <div>
                <p className="kicker">Publish Portfolio</p>
                <h3>팀원 찾기에 내 프로필 등록</h3>
                <p>
                  {myCreatorProfile
                    ? "현재 매칭 보드에 올라간 내 프로필을 수정하거나, 잠시 보드에서 내릴 수 있어요."
                    : "직군과 장르 태그를 올리면 매칭 카드에 바로 노출됩니다. 나중에 다시 등록하면 내용이 수정돼요."}
                </p>
              </div>
              <fieldset className="profile-role-picker">
                <legend>직군 선택</legend>
                {[
                  { value: "WRITER", title: "글", text: "작가 · 대본" },
                  { value: "ILLUSTRATOR", title: "그림", text: "일러스트" },
                  { value: "VOICE_ACTOR", title: "목소리", text: "성우" },
                  { value: "SOUND_DIRECTOR", title: "BGM", text: "사운드" },
                ].map((item) => (
                  <label key={item.value}>
                    <input name="primaryRole" type="radio" value={item.value} defaultChecked={item.value === "WRITER"} />
                    <span>
                      <b>{item.title}</b>
                      <small>{item.text}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <label>
                한 줄 소개
                <input name="headline" required minLength={2} maxLength={80} placeholder="예: 로맨스 판타지 웹툰 콘티와 대사 작업 가능" />
              </label>
              <label>
                장르/스킬 태그
                <input name="skills" required placeholder="예: 로맨스, 웹툰, 판타지, 콘티" />
              </label>
              <label>
                협업 가능 상태
                <input name="availabilityNote" placeholder="예: 주 1회 회의 가능, 단기 프로젝트 가능" />
              </label>
              <label className="wide">
                포트폴리오 설명
                <textarea name="bio" required minLength={5} maxLength={500} placeholder="어떤 장르를 만들 수 있고, 어떤 팀원을 찾는지 적어주세요." />
              </label>
              <div className="creator-profile-form-actions">
                <button className="primary-button" type="submit" disabled={isPublishingCreatorProfile || isDeletingCreatorProfile}>
                  <Sparkles size={17} /> {isPublishingCreatorProfile ? "등록 중" : myCreatorProfile ? "매칭 프로필 수정" : "매칭 보드에 등록"}
                </button>
                {myCreatorProfile && (
                  <button
                    className="ghost-button creator-profile-delete-button"
                    type="button"
                    onClick={() => void deleteMyCreatorProfile()}
                    disabled={isPublishingCreatorProfile || isDeletingCreatorProfile}
                  >
                    <X size={17} /> {isDeletingCreatorProfile ? "내리는 중" : "내 매칭 내리기"}
                  </button>
                )}
              </div>
            </form>
          )}

          <section className="match-inbox-panel">
            <div className="section-head compact-head">
              <div>
                <p className="kicker">Proposal Inbox</p>
                <h2>매칭 제안함</h2>
              </div>
              <p>채팅으로 보낸 수익 지분 제안을 한곳에서 확인하고, 받은 제안은 바로 수락해 팀원으로 합류할 수 있습니다.</p>
            </div>

            <div className="match-inbox-tabs" aria-label="매칭 제안함 필터">
              {[
                { id: "all", label: "전체" },
                { id: "received", label: "받은 제안" },
                { id: "sent", label: "보낸 제안" },
                { id: "pending", label: "대기 중" },
                { id: "accepted", label: "합류 완료" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={matchInboxFilter === item.id ? "active" : ""}
                  onClick={() => setMatchInboxFilter(item.id as typeof matchInboxFilter)}
                  type="button"
                >
                  {item.label}
                  <span>{matchInboxCounts[item.id as keyof typeof matchInboxCounts]}</span>
                </button>
              ))}
            </div>

            <div className="match-inbox-list">
              {filteredMatchProposalInboxItems.length > 0 ? (
                filteredMatchProposalInboxItems.map((item) => {
                  const proposalStatusLabel =
                    item.proposal.status === "ACCEPTED" ? "수락 완료" : item.proposal.status === "DECLINED" ? "거절됨" : "수락 대기";
                  const partnerName =
                    item.partner?.displayName ??
                    (item.direction === "received" ? item.proposal.requesterName : item.proposal.targetName) ??
                    "창작자";
                  const partnerRole = item.partner ? roleLabels[item.partner.primaryRole] : roleLabels[item.proposal.memberRole];

                  return (
                    <article className={`match-inbox-card ${item.direction} ${item.proposal.status.toLowerCase()}`} key={item.id}>
                      <div className="match-inbox-card-head">
                        <span>{item.direction === "received" ? "받은 제안" : "보낸 제안"}</span>
                        <b>{proposalStatusLabel}</b>
                      </div>
                      <div className="match-inbox-partner">
                        <i>{partnerName.slice(0, 1)}</i>
                        <div>
                          <strong>{partnerName}</strong>
                          <small>{partnerRole || "창작자"} · {item.time}</small>
                        </div>
                      </div>
                      <MatchProposalBubble
                        proposal={item.proposal}
                        canAccept={item.canAccept}
                        onAccept={() => void acceptMatchProposal(item.proposal.id)}
                      />
                      <div className="match-inbox-actions">
                        {item.partner && (
                          <button type="button" onClick={() => setSelectedCreator(item.partner)}>
                            프로필 보기
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (item.partner) {
                              setActiveChatCreatorId(item.partner.userId);
                            }
                            setIsMessengerOpen(true);
                            setIsSupportBotOpen(false);
                          }}
                        >
                          채팅 열기
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="match-inbox-empty">
                  <MessageCircle size={24} />
                  <strong>아직 매칭 제안이 없어요</strong>
                  <p>마음에 드는 창작자 카드에서 “수익 지분 제안”을 보내면 이곳에 제안서가 정리됩니다.</p>
                </div>
              )}
            </div>
          </section>

          <div className="matching-toolbar">
            <div>
              <span>탐색 필터</span>
              <strong>{role === "ALL" ? "전체 창작자" : roleLabels[role]} · {matchingFilters.length ? matchingFilters.join(" + ") : "전체 장르"}</strong>
            </div>
            <label className="matching-search">
              <Search size={18} />
              <input
                value={matchingSearch}
                onChange={(event) => setMatchingSearch(event.target.value)}
                placeholder="작품명, 장르, 태그, 창작자 검색"
                type="search"
              />
            </label>
            <div className="role-tabs">
              {roleFilterItems.map((item) => (
                <button key={item} className={role === item ? "active" : ""} onClick={() => setRole(item)}>
                  {item === "ALL" ? "전체" : roleLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="matching-filter-groups" aria-label="매칭 콘텐츠 형식과 장르 필터">
            <div>
              <span>콘텐츠 형식</span>
              <div className="genre-filter">
                {matchingContentFilters.map((filter) => (
                  <button
                    key={filter}
                    className={(filter === "전체" ? matchingFilters.length === 0 : matchingFilters.includes(filter)) ? "active" : ""}
                    onClick={() => toggleMatchingFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span>장르/작업 키워드</span>
              <div className="genre-filter">
                {matchingGenreFilters.map((filter) => (
                  <button
                    key={filter}
                    className={matchingFilters.includes(filter) ? "active" : ""}
                    onClick={() => toggleMatchingFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {matchingActionMessage && <p className="matching-action-message">{matchingActionMessage}</p>}

          <div className="creator-grid">
            {filteredCreators.map((creator) => (
              <article className={`creator-card ${creator.primaryRole.toLowerCase()}`} key={creator.id}>
                <div className="card-top">
                  <span>{roleLabels[creator.primaryRole]}</span>
                  <b>{creator.responseRate}%</b>
                </div>
                <div className="creator-portrait">
                  <strong>{creator.displayName.slice(0, 1)}</strong>
                  <i />
                </div>
                <h3>{creator.displayName}</h3>
                <p className="handle">@{creator.username}</p>
                <p>{creator.headline}</p>
                <div className="portfolio-preview">
                  {getCreatorPortfolio(creator).slice(0, 2).map((item) => (
                    <div key={item.title}>
                      <span>{item.category}</span>
                      <strong>{item.title}</strong>
                    </div>
                  ))}
                </div>
                {creator.voiceDemo && (
                  <div className="wave-player">
                    <Play size={18} />
                    <div>{creator.voiceDemo.waveform.map((height, index) => <i key={index} style={{ height }} />)}</div>
                    <small>{formatDuration(creator.voiceDemo.durationSeconds)}</small>
                  </div>
                )}
                <div className="chips">{creator.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                <div className="creator-card-actions">
                  <button className="portfolio-button" onClick={() => setSelectedCreator(creator)}>프로필 보기</button>
                  <button onClick={() => void sendCreatorChat(creator)}>채팅 보내기</button>
                  <button className="match-offer-button" onClick={() => openMatchProposal(creator)}>지분 제안 매칭</button>
                </div>
              </article>
            ))}
          </div>

          {filteredCreators.length === 0 && (
            <div className="empty-matching">
              <Sparkles size={24} />
              <strong>조건에 맞는 창작자를 찾지 못했어요</strong>
              <p>검색어를 줄이거나 장르/직군 필터를 전체로 바꿔보세요.</p>
            </div>
          )}

          <section className="work-discovery">
            <div className="section-head">
              <div>
                <p className="kicker">Work Discovery</p>
                <h2>장르별 포트폴리오 작품</h2>
              </div>
              <p>검색한 장르와 키워드에 맞는 글, 그림, 목소리, BGM 샘플을 작품 단위로 확인할 수 있습니다.</p>
            </div>
            <div className="work-grid">
              {filteredPortfolioItems.slice(0, 8).map((item) => (
                <article className={`work-card ${item.creator.primaryRole.toLowerCase()}`} key={`${item.creator.id}-${item.title}`}>
                  <span>{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="work-author">
                    <b>{item.creator.displayName}</b>
                    <em>{roleLabels[item.creator.primaryRole]}</em>
                  </div>
                  <div className="chips">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <button onClick={() => setSelectedCreator(item.creator)}>창작자 보기</button>
                </article>
              ))}
            </div>
          </section>
        </section>}

        {activePage === "wallet" && <section className="section wallet-console page-panel">
          <div className="wallet-hero">
            <div>
              <p className="kicker">Coin Wallet</p>
              <h2>독자 결제와 창작자 입금을 한눈에 보는 내 지갑</h2>
              <p>웹툰식 코인 충전, 작품 열람권 구매, 환불 가능 금액, 창작자 정산 입금까지 하나의 원장으로 관리합니다.</p>
              <div className="wallet-hero-actions">
                <button className="primary-button" onClick={openPayment}><Coins size={18} /> 코인 충전하기</button>
                <button className="ghost-button" onClick={() => navigate("discover")}><BookOpen size={18} /> 작품 보러가기</button>
              </div>
            </div>
            <div className="wallet-balance-card">
              <span>현재 보유 코인</span>
              <strong>{formatCoins(currentWalletDetail.balance)}</strong>
              <p>{currentWalletDetail.autoChargeEnabled ? `자동 충전 ON · 다음 예정 ${currentWalletDetail.nextChargeDate}` : "자동 충전 OFF"}</p>
            </div>
          </div>

          <div className="wallet-kpis">
            <article><span>이번 달 사용</span><strong>{formatCoins(currentWalletDetail.monthlySpend)}</strong><p>작품 열람권과 후원 결제</p></article>
            <article><span>이번 달 정산입금</span><strong>{formatCoins(currentWalletDetail.monthlyEarned)}</strong><p>참여 프로젝트 자동 분배</p></article>
            <article><span>환불 가능</span><strong>{formatCoins(currentWalletDetail.refundableCoins)}</strong><p>미사용 결제분 기준</p></article>
            <article><span>보너스 코인</span><strong>{formatCoins(currentWalletDetail.bonusCoins)}</strong><p>이벤트/멤버십 혜택</p></article>
          </div>

          <div className="wallet-layout">
            <section className="wallet-ledger-panel">
              <div className="panel-title">
                <div>
                  <p className="kicker">Wallet Ledger</p>
                  <h3>코인 이용 내역</h3>
                </div>
                <div className="wallet-filter">
                  {(["ALL", "CHARGE", "SPEND", "SETTLEMENT", "REFUND"] as const).map((filter) => (
                    <button
                      key={filter}
                      className={walletFilter === filter ? "active" : ""}
                      onClick={() => setWalletFilter(filter)}
                    >
                      {filter === "ALL" ? "전체" : getWalletTypeLabel(filter)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wallet-ledger-list">
                {filteredWalletTransactions.length > 0 ? (
                  filteredWalletTransactions.map((item) => (
                    <article className={item.amount >= 0 ? "plus" : "minus"} key={item.id}>
                      <div className="wallet-ledger-icon">{item.amount >= 0 ? <Coins size={20} /> : <CreditCard size={20} />}</div>
                      <div>
                        <span>{getWalletTypeLabel(item.type)} · {formatDateTime(item.createdAt)}</span>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                      <div className="wallet-ledger-amount">
                        <b>{item.amount >= 0 ? "+" : ""}{formatCoins(item.amount)}</b>
                        <em>{item.status}</em>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-matching wallet-empty-state">
                    <Coins size={24} />
                    <strong>아직 코인 이용 내역이 없어요</strong>
                    <p>코인을 충전하거나 작품을 구매하면 이곳에 내역이 쌓입니다.</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="wallet-side-stack">
              <article>
                <CreditCard size={22} />
                <strong>결제 수단</strong>
                <p>{currentWalletDetail.paymentMethod}</p>
                <button>결제 수단 변경</button>
              </article>
              <article>
                <Wallet size={22} />
                <strong>정산 계좌</strong>
                <p>{currentWalletDetail.payoutAccount}</p>
                <button onClick={() => navigate("settlement")}>정산 콘솔로 이동</button>
              </article>
              <article>
                <ShieldCheck size={22} />
                <strong>안전 장치</strong>
                <p>미사용 코인 환불, 자동 충전 해지, 이상 결제 알림을 지갑에서 바로 처리할 수 있게 확장했습니다.</p>
                <button>환불/문의 열기</button>
              </article>
            </aside>
          </div>
        </section>}

        {activePage === "settlement" && <section className="section settlement-console page-panel">
          <div className="settlement-hero">
            <div>
              <p className="kicker">Smart Settlement Console</p>
              <h2>고정 규칙으로 운영되는 자동 정산실</h2>
              <p>팀장은 지분율과 팀원 동의 상태만 관리합니다. 매월 15일, 플랫폼 수수료를 제외한 금액이 각자의 지분율대로 자동 분배됩니다.</p>
            </div>
            <div className="settlement-next-card">
              <span><ShieldCheck size={16} /> 고정 정산일</span>
              <strong>매월 15일</strong>
              <p>전월 결제분을 자동 계산해 팀원 지갑으로 지급합니다.</p>
            </div>
          </div>

          <div className="settlement-kpis">
            <article><span>이번 달 총 결제</span><strong>{formatCoins(settlementPreview.grossAmount)}</strong></article>
            <article><span>플랫폼 수수료</span><strong>- {formatCoins(settlementPreview.platformFeeAmount)}</strong></article>
            <article><span>정산 예정일</span><strong>매월 15일</strong></article>
            <article><span>팀 분배 대상</span><strong>{formatCoins(settlementPreview.distributableAmount)}</strong></article>
          </div>

          <div className="settlement-main-grid">
            <section className="settlement-visual-panel">
              <div className="settlement-donut" style={settlementDonutStyle}>
                <div>
                  <span>내 예상 정산</span>
                  <strong>{formatCoins(settlementPreview.mySettlementAmount)}</strong>
                </div>
              </div>
              <div className="settlement-health">
                <div><span>지분율 합계</span><b className={settlementPreview.shareTotal === 100 ? "ok" : "warn"}>{settlementPreview.shareTotal}%</b></div>
                <div><span>적용 수수료</span><b>{settlementConfig.platformFeeRate}%</b></div>
                <div><span>정산일</span><b>15일</b></div>
              </div>
            </section>

            <section className="team-lead-panel">
              <div className="panel-title">
                <div>
                  <p className="kicker">Team Leader Settings</p>
                  <h3>정산 규칙 설정</h3>
                </div>
              </div>

              <div className="settlement-preset-grid" aria-label="정산 지분율 프리셋">
                <button type="button" className="settlement-preset-card featured" onClick={() => applySettlementPreset("audioDrama")}>
                  <span>추천 프리셋</span>
                  <strong>팀장 40 · 팀원 30 · 30</strong>
                  <small>작가/프로듀서 등 팀장 역할에 40%를 우선 배정합니다.</small>
                </button>
                <button type="button" className="settlement-preset-card" onClick={() => applySettlementPreset("equal")}>
                  <span>균등 프리셋</span>
                  <strong>팀원 균등 분배</strong>
                  <small>모든 참여자의 지분율 합계를 100%로 동일하게 맞춥니다.</small>
                </button>
              </div>

              <div className="setting-grid">
                <label>
                  <span>고정 플랫폼 수수료</span>
                  <div className="settlement-rule-card">
                    <i><Coins size={17} /></i>
                    <strong>{settlementConfig.platformFeeRate}%</strong>
                    <small>{settlementConfig.platformFeeRate === 8 ? "공식 파트너 계정 고정 수수료" : "일반 계정 고정 수수료"}</small>
                  </div>
                </label>
                <label>
                  <span>고정 정산일</span>
                  <div className="settlement-rule-card">
                    <i><ShieldCheck size={17} /></i>
                    <strong>매월 15일</strong>
                    <small>전월 1일-말일 결제분 자동 정산</small>
                  </div>
                </label>
                <label>
                  <span>팀원 동의 상태</span>
                  <div className={`settlement-rule-card ${settlementPreview.shareTotal === 100 ? "ok" : "warn"}`}>
                    <i><CheckCircle2 size={17} /></i>
                    <strong>{settlementPreview.shareTotal === 100 ? "정상" : "확인 필요"}</strong>
                    <small>{settlementPreview.shareTotal === 100 ? "지분율 합계 100%로 저장 가능" : "지분율 합계를 100%로 맞춰주세요"}</small>
                  </div>
                </label>
              </div>

              <div className="share-editor">
                {settlementConfig.members.map((member) => (
                  <div className="share-row" key={member.userId}>
                    <div>
                      <strong>{member.displayName}</strong>
                      <span>{roleLabels[member.memberRole]} · @{member.username}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={member.sharePercentage}
                      onChange={(event) => updateMemberShare(member.userId, Number(event.target.value))}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={member.sharePercentage}
                      onChange={(event) => updateMemberShare(member.userId, Number(event.target.value))}
                    />
                  </div>
                ))}
              </div>

              <button className="primary-button settlement-save" onClick={saveSettlementSettings}>정산 설정 저장</button>
              {settlementMessage && <p className={`settlement-message ${settlementPreview.shareTotal === 100 ? "ok" : "warn"}`}>{settlementMessage}</p>}
            </section>
          </div>

          <section className="settlement-ledger">
            <div className="section-head">
              <div>
                <p className="kicker">Distribution Preview</p>
                <h2>팀원별 예상 정산액</h2>
              </div>
              <p>플랫폼 수수료를 제외한 금액을 현재 지분율대로 나눈 미리보기입니다.</p>
            </div>
            <div className="ledger-list">
              {settlementPreview.members.map((member) => (
                <div key={member.userId}>
                  <span>{member.displayName} · {roleLabels[member.memberRole]}</span>
                  <b>{member.sharePercentage}%</b>
                  <strong>{formatCoins(member.expectedSettlement)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="settlement-ops">
            <article><ShieldCheck size={22} /><strong>정산 잠금</strong><p>월 마감 이후 지분율 변경을 잠가 팀원 모두가 같은 기준으로 정산 내역을 확인합니다.</p></article>
            <article><Wallet size={22} /><strong>투명 원장</strong><p>결제 ID, 적용 수수료, 팀원별 지급액을 월별 리포트로 남겨 창작팀 신뢰를 높입니다.</p></article>
            <article><RefreshCw size={22} /><strong>입금 상태 알림</strong><p>매월 15일 지급 완료, 계좌 확인 필요, 지갑 반영 상태를 팀원에게 자동 안내합니다.</p></article>
          </section>
        </section>}

        {activePage === "support" && (
          <section className="section support-page page-panel">
            <div className="support-hero">
              <div>
                <p className="kicker">Support & Trust Center</p>
                <h2>결제, 정산, 접근성 문의와 사용자 신고를 한 곳에서 처리합니다</h2>
                <p>창작자 협업 플랫폼은 신뢰가 제품의 일부입니다. 고객센터와 신고센터를 메뉴에서 바로 접근 가능한 독립 페이지로 분리했습니다.</p>
                <label className="support-search">
                  <Search size={19} />
                  <input placeholder="궁금한 내용을 검색해보세요. 예: 코인 환불, 정산 비율, 신고 처리" type="search" />
                  <button type="button">검색</button>
                </label>
              </div>
              <div className="support-status-card">
                <ShieldCheck size={24} />
                <strong>운영팀 확인 프로세스</strong>
                <span>접수 → 로그 확인 → 조치/답변</span>
                <small>데모 백엔드에 문의와 신고가 저장됩니다.</small>
              </div>
            </div>

            <section className="support-guide-grid">
              <article><Coins size={22} /><strong>결제/환불</strong><p>코인 충전 실패, 중복 결제, 열람권 미지급을 빠르게 확인합니다.</p></article>
              <article><Split size={22} /><strong>정산 확인</strong><p>지분율 변경, 고정 정산일, 파트너 수수료 적용 내역을 검토합니다.</p></article>
              <article><Headphones size={22} /><strong>접근성 지원</strong><p>스크린리더, 고대비 감상 모드, 대본 동기화 문제를 우선 처리합니다.</p></article>
            </section>

            <section className="support-contact-board">
              <article className="support-center-panel support-ticket-panel">
                <div className="support-ticket-head">
                  <div>
                    <p className="kicker">1:1 Ticket</p>
                    <h2>문의 접수</h2>
                    <p>도움봇으로 해결되지 않는 문제는 운영팀 티켓으로 남겨주세요.</p>
                  </div>
                </div>
                <div className="support-form-grid single-support-form">
                  <div>
                    <strong>어떤 도움이 필요하신가요?</strong>
                    <select value={supportCategory} onChange={(event) => setSupportCategory(event.target.value)}>
                      <option value="PAYMENT">결제/환불</option>
                      <option value="SETTLEMENT">정산</option>
                      <option value="ACCESSIBILITY">접근성</option>
                      <option value="BUG">버그 신고</option>
                    </select>
                    <textarea value={supportBody} onChange={(event) => setSupportBody(event.target.value)} placeholder="문의 내용을 입력해 주세요. 예: 코인이 차감됐지만 열람권이 열리지 않았어요." />
                    <button onClick={() => void submitSupportTicket()}><ShieldCheck size={17} /> 문의 접수</button>
                  </div>
                </div>
              </article>

              <article className="support-center-panel report-panel support-report-panel">
                <div className="support-ticket-head">
                  <div>
                    <p className="kicker">Report Center</p>
                    <h2>사용자 신고</h2>
                    <p>매칭 과정의 부적절한 응대, 거래 회피, 괴롭힘을 운영팀에 전달합니다.</p>
                  </div>
                </div>
                <div className="support-form-grid single-support-form">
                  <div>
                    <strong>신고 대상 선택</strong>
                    <select value={reportTargetUserId} onChange={(event) => setReportTargetUserId(event.target.value)}>
                      <option value="">대상 선택</option>
                      {creators.map((creator) => <option key={creator.userId} value={creator.userId}>{creator.displayName}</option>)}
                    </select>
                    <textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="신고 사유와 상황을 적어주세요. 운영팀이 대화/매칭 기록을 확인합니다." />
                    <button onClick={() => void submitUserReport()}><Bell size={17} /> 신고 접수</button>
                  </div>
                </div>
              </article>
            </section>

            {communityMessage && <p className="community-message support-message">{communityMessage}</p>}
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="footer-logo"><img src="/logo.png" alt="" /></span>
          <div>
            <strong>Creator Universe</strong>
            <p>대한민국</p>
          </div>
        </div>
        <p className="footer-copy">Copyright © 2026 Creator Universe Inc. 모든 권리 보유.</p>
        <nav className="footer-links" aria-label="하단 정책 링크">
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">개인정보 처리방침</a>
          <a href="/terms.html" target="_blank" rel="noreferrer">약관</a>
          <a href="/refund-policy.html" target="_blank" rel="noreferrer">판매 및 환불</a>
          <a href="/legal-notice.html" target="_blank" rel="noreferrer">법적 고지</a>
          <a href="/sitemap.html" target="_blank" rel="noreferrer">사이트 맵</a>
          <a href="/account-deletion.html" target="_blank" rel="noreferrer">계정 삭제 안내</a>
        </nav>
      </footer>

      <nav className="mobile-tabs">
        <button className={activePage === "home" ? "active" : ""} onClick={() => navigate("home")}><Home size={18} />홈</button>
        <button className={activePage === "discover" ? "active" : ""} onClick={() => navigate("discover")}><BookOpen size={18} />작품</button>
        <button className={activePage === "studio" ? "active" : ""} onClick={() => navigate("studio")}><Rocket size={18} />스튜디오</button>
        <button className={activePage === "matching" ? "active" : ""} onClick={() => navigate("matching")}><Search size={18} />매칭</button>
        <button className={activePage === "wallet" ? "active" : ""} onClick={() => navigate("wallet")}><Coins size={18} />지갑</button>
        <button className={activePage === "settlement" ? "active" : ""} onClick={() => navigate("settlement")}><Wallet size={18} />정산</button>
        <button className={activePage === "support" ? "active" : ""} onClick={() => navigate("support")}><ShieldCheck size={18} />센터</button>
      </nav>

      <div className={`floating-messenger ${isMessengerOpen ? "open" : ""} ${isMessengerFullscreen ? "fullscreen-mode" : ""}`}>
        {isMessengerOpen && (
          <section className={`floating-messenger-panel ${isMessengerFullscreen ? "fullscreen" : ""}`} aria-label="창작자 채팅방">
            <div className="floating-messenger-head">
              <span><MessageCircle size={18} /></span>
              <div>
                <strong>{isMessengerFullscreen ? "Messages" : "Creator DM"}</strong>
                <small>{isMessengerFullscreen ? "창작자와의 협업 대화를 한 화면에서 관리합니다" : "매칭 상담과 협업 제안을 이어서 보낼 수 있어요"}</small>
              </div>
              <div className="messenger-window-actions">
                <button
                  type="button"
                  onClick={() => setIsMessengerFullscreen((value) => !value)}
                  aria-label={isMessengerFullscreen ? "작은 채팅창으로 보기" : "전체 메시지창으로 보기"}
                >
                  {isMessengerFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMessengerOpen(false);
                    setIsMessengerFullscreen(false);
                  }}
                  aria-label="채팅방 닫기"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="messenger-body">
              <div className="messenger-thread-list" aria-label="채팅 목록">
                {isMessengerFullscreen && (
                  <div className="messenger-inbox-title">
                    <span>Inbox</span>
                    <b>{messengerCreators.length}</b>
                  </div>
                )}
                {messengerCreators.length ? messengerCreators.map((creator) => {
                  const thread = creatorChatThreads[creator.userId] ?? [];
                  const latestMessage = thread[thread.length - 1];
                  return (
                    <button
                      type="button"
                      key={creator.userId}
                      className={activeChatCreator?.userId === creator.userId ? "active" : ""}
                      onClick={() => setActiveChatCreatorId(creator.userId)}
                    >
                      <span>{creator.displayName.slice(0, 1)}</span>
                      <div>
                        <strong>{creator.displayName}</strong>
                        <small>{latestMessage?.text ?? `${roleLabels[creator.primaryRole]} · 협업 가능`}</small>
                      </div>
                      {thread.length > 0 && <i aria-label="읽지 않은 메시지 표시" />}
                    </button>
                  );
                }) : (
                  <div className="messenger-empty">
                    <MessageCircle size={22} />
                    <strong>대화할 창작자를 찾아보세요</strong>
                    <p>매칭 페이지에서 채팅 보내기를 누르면 대화방이 열립니다.</p>
                  </div>
                )}
              </div>

              <div className="messenger-chat-pane">
                {activeChatCreator ? (
                  <>
                    <div className="messenger-chat-title">
                      <div>
                        <strong>{activeChatCreator.displayName}</strong>
                        <small>{roleLabels[activeChatCreator.primaryRole]} · 평균 응답률 {activeChatCreator.responseRate}%</small>
                      </div>
                      <button type="button" onClick={() => setSelectedCreator(activeChatCreator)}>프로필</button>
                    </div>
                    <div className="messenger-messages">
                      {activeChatMessages.length === 0 && (
                        <div className="creator">
                          <span>{activeChatCreator.displayName.slice(0, 1)}</span>
                          <p>안녕하세요. 포트폴리오를 보고 협업 상담을 원하시면 아래에 메시지를 남겨주세요.</p>
                          <small>방금</small>
                        </div>
                      )}
                      {activeChatMessages.length > 0 && <div className="messenger-day-divider"><span>오늘</span></div>}
                      {activeChatMessages.map((message, index) => (
                        <div className={message.from === "me" ? "me" : "creator"} key={`${activeChatCreator.userId}-${index}`}>
                          {message.from === "creator" && <span>{activeChatCreator.displayName.slice(0, 1)}</span>}
                          <p>{message.text}</p>
                          {message.matchProposal && message.from === "creator" && message.matchProposal.status === "PENDING" && (
                            <button
                              className="inline-match-accept-button"
                              type="button"
                              onClick={() => void acceptMatchProposal(message.matchProposal!.id)}
                            >
                              <CheckCircle2 size={15} /> 조건 보고 수락하기
                            </button>
                          )}
                          <small>{message.time}</small>
                        </div>
                      ))}
                    </div>
                    <label className="messenger-input">
                      <input
                        value={messengerInput}
                        onChange={(event) => setMessengerInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void sendMessengerMessage();
                          }
                        }}
                        placeholder={`${activeChatCreator.displayName}님에게 메시지 보내기`}
                      />
                      <button type="button" onClick={() => void sendMessengerMessage()}><Send size={17} /></button>
                    </label>
                  </>
                ) : (
                  <div className="messenger-empty">
                    <MessageCircle size={24} />
                    <strong>아직 열린 채팅방이 없어요</strong>
                    <p>매칭 페이지에서 마음에 드는 창작자에게 먼저 말을 걸어보세요.</p>
                  </div>
                )}
              </div>

              {isMessengerFullscreen && activeChatCreator && (
                <aside className="messenger-profile-panel" aria-label="대화 상대 프로필">
                  <div className="messenger-profile-avatar">{activeChatCreator.displayName.slice(0, 1)}</div>
                  <strong>{activeChatCreator.displayName}</strong>
                  <span>@{activeChatCreator.username}</span>
                  <p>{activeChatCreator.headline}</p>
                  <div className="messenger-profile-status">
                    <span>온라인</span>
                    <small>평균 1시간 내 응답</small>
                  </div>
                  <div>
                    <b>{roleLabels[activeChatCreator.primaryRole]}</b>
                    <b>응답률 {activeChatCreator.responseRate}%</b>
                    <b>{activeChatCreator.completedProjects}개 협업</b>
                  </div>
                  <button type="button" onClick={() => setSelectedCreator(activeChatCreator)}>프로필 자세히 보기</button>
                </aside>
              )}
            </div>
          </section>
        )}
        <button className="floating-messenger-button" type="button" onClick={() => openCreatorMessenger()} aria-label="창작자 채팅 열기">
          {isMessengerOpen ? <X size={23} /> : <MessageCircle size={23} />}
          {!isMessengerOpen && <i />}
        </button>
      </div>
      <div className={`floating-help ${isSupportBotOpen ? "open" : ""}`}>
        {isSupportBotOpen && (
          <section className="floating-help-panel" aria-label="크리에이터 유니버스 도움봇">
            <div className="floating-help-head">
              <span><Bot size={18} /></span>
              <div>
                <strong>Universe Bot</strong>
                <small><i /> 온라인 상담 대기 중</small>
              </div>
              <button type="button" onClick={() => setIsSupportBotOpen(false)} aria-label="도움봇 닫기"><X size={17} /></button>
            </div>
            <div className="floating-help-banner">
              <b>무엇을 도와드릴까요?</b>
              <p>결제, 정산, 접근성, 신고 키워드를 입력하면 알맞은 접수 유형을 추천해요.</p>
            </div>
            <div className="support-chat-window compact-chat" aria-label="고객센터 챗봇 대화">
              {supportChatMessages.map((message, index) => (
                <div className={message.from === "bot" ? "bot" : "user"} key={`${message.from}-${index}`}>
                  <span>{message.from === "bot" ? "CU" : "나"}</span>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
            <div className="support-quick-replies compact-replies">
              {["코인 환불", "정산 오류", "접근성 문제", "사용자 신고"].map((item) => (
                <button key={item} onClick={() => sendSupportBotMessage(item)}>{item}</button>
              ))}
            </div>
            <label className="support-chat-input">
              <input
                value={supportChatInput}
                onChange={(event) => setSupportChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendSupportBotMessage();
                  }
                }}
                placeholder="문의 내용을 입력하세요"
              />
              <button type="button" onClick={() => sendSupportBotMessage()}><Send size={17} /></button>
            </label>
          </section>
        )}
        <button
          className="floating-help-button"
          type="button"
          onClick={() => {
            setIsSupportBotOpen((value) => !value);
            setIsMessengerOpen(false);
          }}
          aria-label="도움봇 열기"
        >
          {isSupportBotOpen ? <X size={24} /> : <Bot size={24} />}
        </button>
      </div>
      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onAuth={completeAuth} />}
      {matchProposalCreator && (
        <MatchProposalModal
          creator={matchProposalCreator}
          project={project}
          share={matchProposalShare}
          message={matchProposalMessage}
          isSubmitting={isMatchProposalSubmitting}
          onShareChange={setMatchProposalShare}
          onMessageChange={setMatchProposalMessage}
          onClose={() => setMatchProposalCreator(null)}
          onSubmit={() => void submitMatchProposal()}
        />
      )}
      {user && isAccountModalOpen && (
        <AccountModal
          user={user}
          wallet={wallet}
          purchasedWorkIds={purchasedWorkIds}
          scrappedWorkIds={scrappedWorkIds}
          recentWorkIds={recentWorkIds}
          premiumSubscription={premiumSubscription}
          notificationPreferences={notificationPreferences}
          onClose={() => setIsAccountModalOpen(false)}
          onLogout={logout}
          onDeleteAccount={() => void deleteAccount()}
          onOpenPayment={() => {
            setIsAccountModalOpen(false);
            openPayment();
          }}
          onStartPremium={startPremiumSubscription}
          onCancelPremium={cancelPremiumSubscription}
          onToggleNotificationPreference={toggleNotificationPreference}
          onNavigate={navigate}
          onOpenLibrary={openReaderLibrary}
        />
      )}
      {selectedCreator && (
        <CreatorDetailModal
          creator={selectedCreator}
          token={token}
          onClose={() => setSelectedCreator(null)}
          onLoginRequired={() => setAuthMode("login")}
          onActionComplete={refreshAfterCommunityAction}
        />
      )}
      {selectedWork && (
        <WorkDetailModal
          work={selectedWork}
          rank={rankedReaderWorks.findIndex((work) => work.id === selectedWork.id) + 1}
          reviews={contentReviews.filter((review) => review.workId === selectedWork.id)}
          creators={creators}
          isPurchased={purchasedWorkIds.includes(selectedWork.id)}
          reviewRating={reviewRating}
          reviewBody={reviewBody}
          onClose={() => setSelectedWork(null)}
          onOpenCreator={(creator) => {
            setSelectedWork(null);
            setSelectedCreator(creator);
          }}
          onOpenPayment={() => openWorkPayment(selectedWork.id)}
          onRatingChange={setReviewRating}
          onReviewBodyChange={setReviewBody}
          onSubmitReview={() => void submitReview(selectedWork.id)}
        />
      )}
      {isPaymentOpen && (
        <PaymentModal
          mode={paymentMode}
          project={project}
          work={paymentMode === "content" ? pendingPurchaseWork : null}
          wallet={wallet}
          isLoggedIn={Boolean(token || user)}
          onClose={() => setIsPaymentOpen(false)}
          onConfirm={handlePaymentConfirm}
          onSwitchToCharge={() => setPaymentMode("charge")}
          onLogin={() => {
            setIsPaymentOpen(false);
            setAuthMode("login");
          }}
        />
      )}
        {policyTab && <PolicyModal initialTab={policyTab} onClose={() => setPolicyTab(null)} />}
    </div>
  );
}

