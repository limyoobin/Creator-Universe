export const tideWork = {
  id: "tide-letter",
  title: "밀물에 답장을",
  coverImage: "/originals/tide-letter/cover.webp",
  participantUserIds: [] as string[],
  format: "웹툰",
  genre: "로맨스 판타지",
  subGenre: "섬마을 판타지 · 모션툰",
  tagline: "내일의 소인이 찍힌 편지가 도착했다. 수신인은 매일 밤 바다로 돌아가는 남자였다.",
  tags: ["웹툰", "로맨스", "판타지", "모션툰", "애니메이션", "완결", "무료"],
  priceCoins: 0, rating: 0, listeners: "0", episodes: 3, badge: "전편 무료", tone: "healing",
};

type Dialogue = { speaker: "이서" | "해온"; line: string };
type Panel = { art: string; alt: string; caption?: string; lines: Dialogue[] };
type Chapter = { title: string; lead: string; panels: Panel[] };
const art = (name: string) => "/originals/tide-letter/" + name + ".webp";

export const tideChapters: Chapter[] = [
  {
    title: "내일의 소인",
    lead: "물이 빠진 뒤에만 문을 여는 우체국이 있다.",
    panels: [
      { art: art("station"), alt: "남빛 갯벌의 잔교 끝, 등불 하나가 켜진 우체국과 빨간 우체통.", caption: "물때표에는 오늘 밤 열한 시까지 길이 남는다고 적혀 있었다. 우편배달부 이서는 꼭 십 분만 일찍 퇴근할 생각이었다.", lines: [] },
      { art: art("1-1"), alt: "노란 우비를 입은 이서가 물기 어린 파란 봉투를 꺼낸다.", lines: [{speaker:"이서",line:"소인이 내일이네. 게다가 우표가 조개껍데기야."}, {speaker:"이서",line:"…반송 주소는 내 필체고."}] },
      { art: art("1-2"), alt: "밀물이 차오르는 잔교에서 은빛 머리의 청년이 편지를 향해 손을 내민다.", lines: [{speaker:"해온",line:"그거, 제게 온 편지예요. 내일 아침에 제가 사라지거든요."}, {speaker:"이서",line:"수취인 성함부터요. 우리 우체국은 유령한테도 서명 받아요."}] },
      { art: art("1-3"), alt: "이서와 해온이 등불 아래 서로의 손을 바라본다.", caption: "그가 이름을 쓰자 마지막 획이 물고기처럼 꼬리를 치며 사라졌다.", lines: [{speaker:"해온",line:"해온. 밀물마다 한 획씩 지워져요."},{speaker:"이서",line:"그럼 같이 열어요. 내일의 내가 오늘의 나한테 뭘 맡겼는지."}] },
    ],
  },
  {
    title: "이름이 번지는 밤",
    lead: "봉투 속에는 편지 대신 한 귀퉁이가 빈 지도가 접혀 있었다.",
    panels: [
      { art: art("letter"), alt: "물길 지도와 초승달 소인, 접힌 파란 종이가 등잔 옆에 놓여 있다.", caption: "섬 지도에는 사라진 모랫길이 붉게 남아 있었다. 해온이 십 년 전 마지막으로 그린 길이었다.", lines: [] },
      { art: art("2-1"), alt: "이서와 해온이 낡은 나무 책상 위 지도를 함께 펼쳐 본다.", lines: [{speaker:"이서",line:"길은 잠겼는데 왜 지우지 않았어요?"},{speaker:"해온",line:"우체통 옆에서 어떤 애가 매일 손을 흔들었거든요. 돌아올 주소 하나쯤은 남겨 두고 싶어서."}] },
      { art: art("2-2"), alt: "손끝이 물처럼 흐려지는 해온의 손목을 이서가 붙든다.", caption: "종이 울렸다. 물때가 바뀌기엔 한 시간이나 일렀다.", lines: [{speaker:"이서",line:"그 애, 나예요. 당신한테 온 답장이 한 번도 없어서 우체부가 됐는데."},{speaker:"해온",line:"썼어요. 바다는 편지를 죄다 젖게 해서… 매번 다시 썼어요."}] },
      { art: art("2-3"), alt: "비가 흐르는 창 앞에서 이서가 손바닥으로 해온의 뺨에 남은 물기를 닦는다.", lines: [{speaker:"이서",line:"그럼 이번엔 내가 배달할게요. 받는 주소, 말해 줘요."},{speaker:"해온",line:"내일 아침. 당신이 서 있을 곳."}] },
    ],
  },
  {
    title: "받는 곳은 여기",
    lead: "새벽 첫배가 들어오기 전, 잔교의 마지막 발판이 잠겼다.",
    panels: [
      { art: art("3-1"), alt: "잠긴 잔교 너머의 해온을 향해 이서가 파란 종이배를 내민다.", caption: "이서는 돌아올 길이 그려진 지도를 뒤집었다. 빈 곳에 답장을 쓰고, 젖은 적 없는 면이 바깥이 되도록 접었다.", lines: [{speaker:"이서",line:"해온 씨. 길 그리는 사람도 길을 잃으면 불러도 돼요. 나 여기 있어요!"}] },
      { art: art("dawn"), alt: "새벽 물길을 따라 등불을 실은 종이배가 건너간다.", caption: "파란 배가 두 사람 사이를 건넜다. 배 밑으로 어제도 내일도 아닌, 오늘의 모랫길이 드러났다.", lines: [] },
      { art: art("3-2"), alt: "두 사람이 손을 포개어 답장 위에 초승달 소인을 누른다.", lines: [{speaker:"해온",line:"받았습니다. 이번엔 이름 끝까지 쓸 수 있어요."},{speaker:"이서",line:"날짜도 써요. 내일의 내가 또 야근시키면 곤란하니까."}] },
      { art: art("3-3"), alt: "아침빛 속, 이서와 해온이 난간에 나란히 기대 서로를 보며 웃는다.", caption: "그해 봄부터 섬의 우체국은 아침에도 문을 열었다. 둘이 같이 아침을 먹는 동안만 빼고.", lines: [{speaker:"해온",line:"답장은 언제까지 써야 해요?"},{speaker:"이서",line:"급한 거 아니면… 내일도 직접 와요."}] },
    ],
  },
];
