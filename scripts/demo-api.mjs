import express from "express";
import crypto from "node:crypto";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const PROJECT_ID = "project-midnight-signal";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

const users = [
  {
    id: "user-reader-one",
    email: "reader@example.com",
    username: "reader_one",
    displayName: "새벽 독자",
    password: "demo1234",
    userType: "READER",
    isOfficialPartner: false,
    walletBalance: 5000,
  },
  {
    id: "user-yurino",
    email: "yurino@example.com",
    username: "yurino_script",
    displayName: "유리노",
    password: "demo1234",
    userType: "CREATOR",
    isOfficialPartner: true,
    walletBalance: 25000,
  },
  {
    id: "user-renka",
    email: "renka@example.com",
    username: "renka_frame",
    displayName: "렌카",
    password: "demo1234",
    userType: "CREATOR",
    isOfficialPartner: true,
    walletBalance: 21400,
  },
  {
    id: "user-haruka",
    email: "haruka@example.com",
    username: "haruka_voice",
    displayName: "하루카",
    password: "demo1234",
    userType: "CREATOR",
    isOfficialPartner: true,
    walletBalance: 38600,
  },
  {
    id: "user-ion",
    email: "ion@example.com",
    username: "ion_bgm",
    displayName: "이온",
    password: "demo1234",
    userType: "CREATOR",
    isOfficialPartner: false,
    walletBalance: 11800,
  },
];

const creators = [
  {
    id: "profile-yurino",
    userId: "user-yurino",
    username: "yurino_script",
    displayName: "유리노",
    primaryRole: "WRITER",
    headline: "감정선이 진한 미스터리 웹소설 각색",
    bio: "대사 리듬과 챕터 훅 설계에 강한 작가입니다.",
    skills: ["웹소설", "각색", "세계관"],
    availabilityNote: "신규 오디오 드라마 1건 가능",
    responseRate: 98,
    followerCount: 12400,
    completedProjects: 18,
    portfolioSummary: "미스터리, 도시괴담, 감성 판타지 장르를 주로 쓰며 오디오화를 고려한 대사 밀도와 장면 호흡 설계에 강합니다.",
    portfolioItems: [
      {
        title: "비 오는 골목의 라디오",
        category: "미스터리 · 감성 웹소설",
        description: "사라진 목소리를 따라가는 도시괴담풍 단편. 성우 2인극으로 각색 가능한 대사 중심 샘플입니다.",
        tags: ["미스터리", "도시괴담", "대사"],
      },
      {
        title: "유리성의 마지막 독백",
        category: "판타지 · 독백극",
        description: "고립된 성의 마법사가 남기는 마지막 기록을 오디오 독백극 형태로 구성했습니다.",
        tags: ["판타지", "독백", "감정선"],
      },
    ],
    voiceDemo: null,
  },
  {
    id: "profile-renka",
    userId: "user-renka",
    username: "renka_frame",
    displayName: "렌카",
    primaryRole: "ILLUSTRATOR",
    headline: "네온 누아르 배경과 캐릭터 키비주얼",
    bio: "서브컬처 감성의 콘셉트 아트와 커버 일러스트를 제작합니다.",
    skills: ["키비주얼", "캐릭터", "배경"],
    availabilityNote: "커버 2주 납기 가능",
    responseRate: 94,
    followerCount: 8300,
    completedProjects: 24,
    portfolioSummary: "네온 누아르, 몽환적인 밤 배경, 서브컬처 캐릭터 키비주얼을 주로 작업합니다.",
    portfolioItems: [
      {
        title: "Neon Alley Key Visual",
        category: "오디오 드라마 키비주얼",
        description: "비 오는 네온 골목과 주인공 실루엣을 중심으로 한 메인 커버 일러스트입니다.",
        tags: ["키비주얼", "네온", "배경"],
      },
      {
        title: "Signal Character Sheet",
        category: "캐릭터 설정화",
        description: "성우 톤과 장면 분위기에 맞춰 표정, 의상, 색감 가이드를 정리한 캐릭터 시트입니다.",
        tags: ["캐릭터", "컨셉", "표정"],
      },
    ],
    voiceDemo: null,
  },
  {
    id: "profile-haruka",
    userId: "user-haruka",
    username: "haruka_voice",
    displayName: "하루카",
    primaryRole: "VOICE_ACTOR",
    headline: "차분한 내레이션부터 격정 연기까지",
    bio: "오디오 웹툰과 보이스 드라마에 특화된 성우 지망생입니다.",
    skills: ["내레이션", "감정연기", "ASMR"],
    availabilityNote: "야간 녹음 가능",
    responseRate: 99,
    followerCount: 15100,
    completedProjects: 31,
    portfolioSummary: "차분한 내레이션, 감정 기복이 큰 드라마 연기, ASMR 톤의 근거리 대사에 강합니다.",
    portfolioItems: [
      {
        title: "차분한 밤의 내레이션",
        category: "내레이션 · 저음톤",
        description: "장면 묘사가 많은 웹소설을 저시력자도 쉽게 따라갈 수 있도록 안정적으로 읽은 샘플입니다.",
        tags: ["내레이션", "저음", "몰입"],
      },
      {
        title: "추격 장면 감정 연기",
        category: "드라마 연기",
        description: "호흡, 떨림, 속도 변화를 활용해 긴박한 추격 장면을 표현한 보이스 포트폴리오입니다.",
        tags: ["감정연기", "액션", "호흡"],
      },
    ],
    voiceDemo: {
      title: "Midnight Signal Voice Demo",
      durationSeconds: 78,
      waveform: [18, 42, 24, 60, 36, 72, 28, 52, 44, 68, 22, 48, 74, 39, 58, 31, 64, 26, 46, 70],
    },
  },
  {
    id: "profile-ion",
    userId: "user-ion",
    username: "ion_bgm",
    displayName: "이온",
    primaryRole: "SOUND_DIRECTOR",
    headline: "3D 입체음향과 앰비언트 BGM 설계",
    bio: "헤드폰에서 공간감이 살아나는 사운드스케이프를 만듭니다.",
    skills: ["BGM", "폴리", "3D 오디오"],
    availabilityNote: "단편 프로젝트 즉시 합류 가능",
    responseRate: 91,
    followerCount: 4700,
    completedProjects: 12,
    portfolioSummary: "비, 지하철, 골목, 실내 잔향 등 공간이 느껴지는 앰비언트와 3D 오디오 설계를 합니다.",
    portfolioItems: [
      {
        title: "Rain Alley Ambience",
        category: "앰비언트 · 3D 오디오",
        description: "빗소리, 전기 간판, 발걸음이 이어폰 안에서 이동하도록 구성한 공간형 사운드스케이프입니다.",
        tags: ["앰비언트", "3D", "폴리"],
      },
      {
        title: "Opening Theme Loop",
        category: "BGM · 루프",
        description: "오디오 드라마 오프닝에 사용할 수 있는 45초 신스 기반 루프형 테마입니다.",
        tags: ["BGM", "신스", "루프"],
      },
    ],
    voiceDemo: {
      title: "Rain Alley Ambience",
      durationSeconds: 52,
      waveform: [10, 22, 18, 34, 44, 26, 62, 38, 28, 74, 45, 33, 57, 21, 40, 66, 35, 50, 24, 43],
    },
  },
];

const project = {
  id: PROJECT_ID,
  title: "미드나잇 시그널",
  synopsis: "비 오는 도시의 라디오 주파수에서 사라진 목소리를 추적하는 배리어프리 오디오 드라마.",
  priceCoins: 1000,
  isOfficialPartner: false,
  platformFeeRate: 0.15,
  partnerFeeRate: 0.08,
  monthlyGrossAmount: 100000,
};

const members = [
  { userId: "user-yurino", displayName: "유리노", username: "yurino_script", memberRole: "WRITER", sharePercentage: 30 },
  { userId: "user-renka", displayName: "렌카", username: "renka_frame", memberRole: "ILLUSTRATOR", sharePercentage: 30 },
  { userId: "user-haruka", displayName: "하루카", username: "haruka_voice", memberRole: "VOICE_ACTOR", sharePercentage: 40 },
];

const transcriptCues = [
  { startMs: 0, endMs: 3500, text: "비가 그친 줄 알았는데, 도시는 아직도 낮은 주파수로 울고 있었다." },
  { startMs: 3500, endMs: 7200, text: "이어폰 너머에서 누군가 내 이름을 불렀다. 아주 오래전에 사라진 목소리였다." },
  { startMs: 7200, endMs: 11200, text: "나는 화면을 보지 않고도 길을 찾을 수 있었다. 소리가 먼저 방향을 알려주었으니까." },
  { startMs: 11200, endMs: 15800, text: "그 밤, 우리의 프로젝트는 한 명의 독자에게서 다시 시작됐다." },
];

const sessions = new Map();
const access = new Set(["user-yurino", "user-renka", "user-haruka"]);
const transactions = [];
const coinCharges = [];
const creatorDonations = [];
const creatorSubscriptions = [];
const fanPostUnlocks = [];
const supportTickets = [];
const userReports = [];
const chatMessages = [];
const matchRequests = [];
const contentReviews = [
  {
    id: "review-seed-1",
    workId: "midnight-signal",
    authorName: "새벽 독자",
    rating: 5,
    body: "대본 싱크랑 성우 연기가 좋아서 몰입감이 강했어요.",
    createdAt: "2026-05-03T12:00:00.000Z",
  },
  {
    id: "review-seed-2",
    workId: "dragon-archive",
    authorName: "판타지러",
    rating: 4,
    body: "웹툰으로 보고 BGM 버전까지 이어지는 흐름이 좋습니다.",
    createdAt: "2026-05-02T18:30:00.000Z",
  },
];

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
  };
}

function publicChatUser(user) {
  const creator = creators.find((profile) => profile.userId === user.id);
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    userType: user.userType,
    primaryRole: creator?.primaryRole || null,
    responseRate: creator?.responseRate || null,
    headline: creator?.headline || "",
  };
}

function formatChatMessage(viewerId, message) {
  return {
    id: message.id,
    senderId: message.senderId,
    receiverUserId: message.receiverUserId,
    body: message.body,
    createdAt: message.createdAt,
    from: message.senderId === viewerId ? "me" : "creator",
  };
}

function buildChatThreads(viewerId) {
  const relevantMessages = chatMessages
    .filter((message) => message.senderId === viewerId || message.receiverUserId === viewerId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const threadMap = new Map();
  relevantMessages.forEach((message) => {
    const otherUserId = message.senderId === viewerId ? message.receiverUserId : message.senderId;
    const otherUser = users.find((user) => user.id === otherUserId);
    if (!otherUser) {
      return;
    }

    if (!threadMap.has(otherUserId)) {
      threadMap.set(otherUserId, {
        otherUser: publicChatUser(otherUser),
        messages: [],
      });
    }

    threadMap.get(otherUserId).messages.push(formatChatMessage(viewerId, message));
  });

  return Array.from(threadMap.values()).sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.createdAt || "";
    const bLast = b.messages[b.messages.length - 1]?.createdAt || "";
    return new Date(bLast).getTime() - new Date(aLast).getTime();
  });
}

function getToken(req) {
  const header = req.header("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
}

function currentUser(req) {
  const token = getToken(req);
  const userId = token ? sessions.get(token) : null;
  return users.find((user) => user.id === userId) || null;
}

function requireUser(req, res) {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "로그인이 필요합니다." });
    return null;
  }
  return user;
}

function json(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

function calculateSettlement(grossAmount, viewerUserId) {
  const feeRate = project.isOfficialPartner ? project.partnerFeeRate : project.platformFeeRate;
  const platformFeeAmount = Math.floor(grossAmount * feeRate);
  const netAmount = grossAmount - platformFeeAmount;
  const settledMembers = members.map((member) => ({
    ...member,
    expectedSettlement: Math.floor(netAmount * (member.sharePercentage / 100)),
  }));
  const me = settledMembers.find((member) => member.userId === viewerUserId);

  return {
    grossAmount,
    platformFeeAmount,
    netAmount,
    appliedFeeRate: feeRate,
    members: settledMembers,
    mySettlement: {
      sharePercentage: me?.sharePercentage || 0,
      amount: me?.expectedSettlement || 0,
    },
  };
}

function buildWalletDetail(user) {
  const myPurchases = transactions.filter((item) => item.buyerId === user.id);
  const myCharges = coinCharges.filter((item) => item.userId === user.id);
  const member = members.find((item) => item.userId === user.id);
  const monthlySpend = myPurchases.reduce((sum, item) => sum + item.grossAmount, 0);
  const settlementPreview = calculateSettlement(project.monthlyGrossAmount, user.id);
  const monthlyEarned = member ? settlementPreview.mySettlement.amount : 0;
  const purchaseLedger = myPurchases.map((item) => ({
    id: item.id,
    type: "SPEND",
    title: `${project.title} 열람권 구매`,
    description: "구매 즉시 콘텐츠 접근권이 발급되고 창작팀 정산 큐에 반영되었습니다.",
    amount: -item.grossAmount,
    status: "환불 가능",
    createdAt: item.purchasedAt,
    projectTitle: project.title,
  }));
  const chargeLedger = myCharges.map((item) => ({
    id: item.id,
    type: "CHARGE",
    title: `코인 ${item.coinAmount.toLocaleString("ko-KR")} 충전`,
    description: `${item.paymentAmountKrw.toLocaleString("ko-KR")}원 결제로 코인이 충전되었습니다.`,
    amount: item.coinAmount,
    status: "완료",
    createdAt: item.createdAt,
  }));
  const seedLedger = [
    {
      id: "wallet-demo-charge",
      type: "CHARGE",
      title: "코인 5,000 충전",
      description: "대표 결제 수단으로 코인이 충전되었습니다.",
      amount: 5000,
      status: "완료",
      createdAt: "2026-05-03T11:20:00.000Z",
    },
    {
      id: "wallet-demo-bonus",
      type: "BONUS",
      title: "신규 독자 보너스",
      description: "첫 작품 구매를 위한 이벤트 보너스 코인이 지급되었습니다.",
      amount: 300,
      status: "완료",
      createdAt: "2026-05-02T09:00:00.000Z",
    },
  ];
  const creatorLedger = member
    ? [
        {
          id: "wallet-demo-settlement",
          type: "SETTLEMENT",
          title: `${project.title} 정산 입금`,
          description: `${member.sharePercentage}% 지분율에 따라 이번 달 예상 정산액이 지갑에 반영됩니다.`,
          amount: monthlyEarned,
          status: "대기",
          createdAt: "2026-05-04T09:00:00.000Z",
          projectTitle: project.title,
        },
      ]
    : [];

  return {
    balance: user.walletBalance,
    monthlySpend,
    monthlyEarned,
    refundableCoins: myPurchases.length ? project.priceCoins : 0,
    bonusCoins: 300,
    autoChargeEnabled: true,
    nextChargeDate: "2026-05-15",
    paymentMethod: "Npay 간편결제 · **** 1428",
    payoutAccount: member ? "국민은행 · ***-02-9812" : "창작자 등록 후 계좌 연결 가능",
    transactions: [...purchaseLedger, ...chargeLedger, ...creatorLedger, ...seedLedger].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "creator-universe-demo-api" });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find((item) => item.username === username && item.password === password);
  if (!user) {
    res.status(401).json({ success: false, message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    return;
  }
  const token = crypto.randomUUID();
  sessions.set(token, user.id);
  json(res, { user: publicUser(user), token });
});

app.post("/api/auth/signup", (req, res) => {
  const { displayName, email, username, password } = req.body || {};
  if (!displayName || !email || !username || !password) {
    res.status(422).json({ success: false, message: "회원가입 정보를 모두 입력해 주세요." });
    return;
  }
  if (users.some((user) => user.username === username || user.email === email)) {
    res.status(409).json({ success: false, message: "이미 사용 중인 아이디 또는 이메일입니다." });
    return;
  }
  const user = {
    id: `user-${crypto.randomUUID()}`,
    email,
    username,
    displayName,
    password,
    userType: "READER",
    isOfficialPartner: false,
    walletBalance: 0,
  };
  users.push(user);
  const token = crypto.randomUUID();
  sessions.set(token, user.id);
  json(res, { user: publicUser(user), token }, 201);
});

app.get("/api/auth/me", (req, res) => {
  const user = requireUser(req, res);
  if (user) {
    json(res, publicUser(user));
  }
});

app.post("/api/auth/logout", (req, res) => {
  const token = getToken(req);
  if (token) {
    sessions.delete(token);
  }
  json(res, { loggedOut: true });
});

app.post("/api/auth/find-id", (req, res) => {
  const user = users.find((item) => item.email === req.body?.email);
  if (!user) {
    res.status(404).json({ success: false, message: "해당 이메일의 계정을 찾을 수 없습니다." });
    return;
  }
  json(res, { username: user.username, displayName: user.displayName });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { username, email, newPassword } = req.body || {};
  const user = users.find((item) => item.username === username && item.email === email);
  if (!user) {
    res.status(404).json({ success: false, message: "계정 정보를 확인해 주세요." });
    return;
  }
  user.password = newPassword;
  json(res, { reset: true });
});

app.get("/api/creators", (req, res) => {
  const role = typeof req.query.role === "string" ? req.query.role : "ALL";
  json(res, role === "ALL" ? creators : creators.filter((creator) => creator.primaryRole === role));
});

app.get("/api/projects/:projectId", (req, res) => {
  if (req.params.projectId !== PROJECT_ID) {
    res.status(404).json({ success: false, message: "프로젝트를 찾을 수 없습니다." });
    return;
  }
  const user = currentUser(req);
  json(res, {
    title: project.title,
    synopsis: project.synopsis,
    priceCoins: project.priceCoins,
    hasAccess: Boolean(user && (access.has(user.id) || members.some((member) => member.userId === user.id))),
    appliedFeeRate: project.isOfficialPartner ? project.partnerFeeRate : project.platformFeeRate,
  });
});

app.get("/api/users/me/wallet", (req, res) => {
  const user = requireUser(req, res);
  if (user) {
    json(res, { balance: user.walletBalance });
  }
});

app.get("/api/users/me/wallet/detail", (req, res) => {
  const user = requireUser(req, res);
  if (user) {
    json(res, buildWalletDetail(user));
  }
});

app.post("/api/users/me/wallet/charge", (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const coinAmount = Number(req.body?.coinAmount);
  const paymentAmountKrw = Number(req.body?.paymentAmountKrw);
  if (!Number.isInteger(coinAmount) || coinAmount <= 0 || !Number.isInteger(paymentAmountKrw) || paymentAmountKrw <= 0) {
    res.status(422).json({ success: false, message: "충전 코인과 결제 금액을 확인해 주세요." });
    return;
  }

  user.walletBalance += coinAmount;
  const charge = {
    id: `charge-${crypto.randomUUID()}`,
    userId: user.id,
    coinAmount,
    paymentAmountKrw,
    externalPaymentId: String(req.body?.externalPaymentId || ""),
    createdAt: new Date().toISOString(),
  };
  coinCharges.push(charge);

  json(res, {
    charge,
    walletBalance: user.walletBalance,
  }, 201);
});

app.post("/api/creators/:creatorUserId/donations", (req, res) => {
  const supporter = requireUser(req, res);
  if (!supporter) {
    return;
  }
  const amount = Number(req.body?.amount);
  const creator = users.find((item) => item.id === req.params.creatorUserId);
  if (!creator) {
    res.status(404).json({ success: false, message: "창작자를 찾을 수 없습니다." });
    return;
  }
  if (!Number.isInteger(amount) || amount < 100 || amount > 100000) {
    res.status(422).json({ success: false, message: "후원 코인은 100~100,000 사이로 입력해 주세요." });
    return;
  }
  supporter.walletBalance = Math.max(0, supporter.walletBalance - amount);
  creator.walletBalance += amount;
  const donation = {
    id: `donation-${crypto.randomUUID()}`,
    supporterId: supporter.id,
    creatorUserId: creator.id,
    amount,
    message: String(req.body?.message || ""),
    createdAt: new Date().toISOString(),
  };
  creatorDonations.push(donation);
  json(res, { donation, walletBalance: supporter.walletBalance }, 201);
});

app.post("/api/creators/:creatorUserId/subscriptions", (req, res) => {
  const subscriber = requireUser(req, res);
  if (!subscriber) {
    return;
  }
  const creator = users.find((item) => item.id === req.params.creatorUserId);
  const priceCoins = Number(req.body?.priceCoins);
  if (!creator) {
    res.status(404).json({ success: false, message: "창작자를 찾을 수 없습니다." });
    return;
  }
  if (!Number.isInteger(priceCoins) || priceCoins <= 0) {
    res.status(422).json({ success: false, message: "구독 금액이 올바르지 않습니다." });
    return;
  }
  subscriber.walletBalance = Math.max(0, subscriber.walletBalance - priceCoins);
  creator.walletBalance += priceCoins;
  const subscription = {
    id: `sub-${crypto.randomUUID()}`,
    subscriberId: subscriber.id,
    creatorUserId: creator.id,
    tierName: String(req.body?.tierName || "Fan Light"),
    priceCoins,
    status: "ACTIVE",
    startedAt: new Date().toISOString(),
  };
  creatorSubscriptions.push(subscription);
  json(res, { subscription, walletBalance: subscriber.walletBalance }, 201);
});

app.post("/api/fan-posts/:postId/unlock", (req, res) => {
  const buyer = requireUser(req, res);
  if (!buyer) {
    return;
  }
  const priceCoins = Number(req.body?.priceCoins || 0);
  buyer.walletBalance = Math.max(0, buyer.walletBalance - priceCoins);
  const unlock = {
    id: `unlock-${crypto.randomUUID()}`,
    userId: buyer.id,
    postId: req.params.postId,
    priceCoins,
    unlockedAt: new Date().toISOString(),
  };
  fanPostUnlocks.push(unlock);
  json(res, { unlock, walletBalance: buyer.walletBalance }, 201);
});

app.get("/api/content/reviews", (_req, res) => {
  json(res, contentReviews);
});

app.post("/api/content/reviews", (req, res) => {
  const author = requireUser(req, res);
  if (!author) {
    return;
  }
  const rating = Number(req.body?.rating);
  const body = String(req.body?.body || "").trim();
  if (!req.body?.workId || !Number.isInteger(rating) || rating < 1 || rating > 5 || body.length < 2) {
    res.status(422).json({ success: false, message: "작품, 별점, 리뷰 내용을 확인해 주세요." });
    return;
  }
  const review = {
    id: `review-${crypto.randomUUID()}`,
    workId: String(req.body.workId),
    authorName: author.displayName,
    rating,
    body,
    createdAt: new Date().toISOString(),
  };
  contentReviews.unshift(review);
  json(res, review, 201);
});

app.post("/api/support/tickets", (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }
  const body = String(req.body?.body || "").trim();
  if (body.length < 3) {
    res.status(422).json({ success: false, message: "문의 내용을 입력해 주세요." });
    return;
  }
  const ticket = {
    id: `ticket-${crypto.randomUUID()}`,
    userId: user.id,
    category: String(req.body?.category || "GENERAL"),
    body,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };
  supportTickets.push(ticket);
  json(res, ticket, 201);
});

app.post("/api/reports", (req, res) => {
  const reporter = requireUser(req, res);
  if (!reporter) {
    return;
  }
  const reason = String(req.body?.reason || "").trim();
  if (reason.length < 3) {
    res.status(422).json({ success: false, message: "신고 사유를 입력해 주세요." });
    return;
  }
  const report = {
    id: `report-${crypto.randomUUID()}`,
    reporterId: reporter.id,
    targetUserId: String(req.body?.targetUserId || ""),
    reason,
    context: String(req.body?.context || ""),
    status: "RECEIVED",
    createdAt: new Date().toISOString(),
  };
  userReports.push(report);
  json(res, report, 201);
});

app.post("/api/chats/messages", (req, res) => {
  const sender = requireUser(req, res);
  if (!sender) {
    return;
  }
  const body = String(req.body?.body || "").trim();
  const receiver = users.find((user) => user.id === req.body?.receiverUserId);
  if (!receiver || body.length < 2) {
    res.status(422).json({ success: false, message: "채팅 대상과 메시지를 입력해 주세요." });
    return;
  }
  const message = {
    id: `chat-${crypto.randomUUID()}`,
    senderId: sender.id,
    receiverUserId: receiver.id,
    body,
    createdAt: new Date().toISOString(),
  };
  chatMessages.push(message);

  let autoReply = null;
  const receiverCreator = creators.find((creator) => creator.userId === receiver.id);
  if (receiverCreator && sender.id !== receiver.id && req.body?.demoAutoReply !== false) {
    autoReply = {
      id: `chat-${crypto.randomUUID()}`,
      senderId: receiver.id,
      receiverUserId: sender.id,
      body: "메시지 확인했어요. 포트폴리오와 일정 확인 후 협업 가능 범위를 바로 답드릴게요.",
      createdAt: new Date(Date.now() + 1000).toISOString(),
    };
    chatMessages.push(autoReply);
  }

  json(res, {
    message: formatChatMessage(sender.id, message),
    autoReply: autoReply ? formatChatMessage(sender.id, autoReply) : null,
    thread: buildChatThreads(sender.id).find((thread) => thread.otherUser.id === receiver.id) || null,
  }, 201);
});

app.get("/api/chats/threads", (req, res) => {
  const viewer = requireUser(req, res);
  if (!viewer) {
    return;
  }
  json(res, buildChatThreads(viewer.id));
});

app.get("/api/chats/:otherUserId/messages", (req, res) => {
  const viewer = requireUser(req, res);
  if (!viewer) {
    return;
  }
  const otherUser = users.find((user) => user.id === req.params.otherUserId);
  if (!otherUser) {
    res.status(404).json({ success: false, message: "대화 상대를 찾을 수 없습니다." });
    return;
  }
  const thread = buildChatThreads(viewer.id).find((item) => item.otherUser.id === otherUser.id);
  json(res, thread || { otherUser: publicChatUser(otherUser), messages: [] });
});

app.post("/api/matching/requests", (req, res) => {
  const requester = requireUser(req, res);
  if (!requester) {
    return;
  }
  if (!req.body?.targetUserId) {
    res.status(422).json({ success: false, message: "매칭 요청 대상을 선택해 주세요." });
    return;
  }
  const matchRequest = {
    id: `match-${crypto.randomUUID()}`,
    requesterId: requester.id,
    targetUserId: String(req.body.targetUserId),
    projectType: String(req.body?.projectType || "협업 프로젝트"),
    message: String(req.body?.message || "함께 프로젝트를 만들고 싶습니다."),
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  matchRequests.push(matchRequest);
  json(res, matchRequest, 201);
});

app.get("/api/projects/:projectId/settlement-dashboard", (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }
  json(res, calculateSettlement(project.monthlyGrossAmount, user.id));
});

app.get("/api/projects/:projectId/viewer", (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }
  if (!access.has(user.id) && !members.some((member) => member.userId === user.id)) {
    res.status(403).json({ success: false, message: "콘텐츠 구매 후 뷰어가 열립니다." });
    return;
  }
  json(res, {
    project: {
      title: project.title,
      synopsis: project.synopsis,
    },
    episode: {
      title: "Episode 01. 비 오는 주파수",
      summary: "첫 결제와 함께 자동 정산이 실행되는 데모 에피소드입니다.",
      durationSeconds: 248,
      transcriptCues,
    },
  });
});

app.post("/api/settlements/content-purchase", (req, res) => {
  const buyer = requireUser(req, res);
  if (!buyer) {
    return;
  }
  const coinAmount = Number(req.body?.coinAmount || 1000);
  if (!Number.isFinite(coinAmount) || coinAmount <= 0) {
    res.status(422).json({ success: false, message: "결제 금액이 올바르지 않습니다." });
    return;
  }

  const settlement = calculateSettlement(coinAmount, buyer.id);
  if (buyer.walletBalance < coinAmount) {
    res.status(402).json({ success: false, message: "보유 코인이 부족합니다. 코인을 충전해 주세요." });
    return;
  }

  buyer.walletBalance -= coinAmount;
  for (const member of settlement.members) {
    const user = users.find((item) => item.id === member.userId);
    if (user) {
      user.walletBalance += member.expectedSettlement;
    }
  }
  project.monthlyGrossAmount += coinAmount;
  access.add(buyer.id);
  transactions.push({
    id: `tx-${crypto.randomUUID()}`,
    buyerId: buyer.id,
    projectId: PROJECT_ID,
    grossAmount: coinAmount,
    platformFeeAmount: settlement.platformFeeAmount,
    netAmount: settlement.netAmount,
    purchasedAt: new Date().toISOString(),
  });

  json(res, {
    transaction: transactions.at(-1),
    settlements: settlement.members.map((member) => ({
      userId: member.userId,
      memberRole: member.memberRole,
      sharePercentage: member.sharePercentage,
      settledAmount: member.expectedSettlement,
    })),
  }, 201);
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Unknown route: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`Creator Universe demo API running on http://127.0.0.1:${PORT}`);
});
