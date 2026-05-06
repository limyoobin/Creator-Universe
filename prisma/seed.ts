import {
  MemberRole,
  PartnerTier,
  ProjectStatus,
  UserRole,
  PrismaClient,
} from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function seedPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  await prisma.settlementDistribution.deleteMany();
  await prisma.contentAccess.deleteMany();
  await prisma.transcriptCue.deleteMany();
  await prisma.projectEpisode.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.project.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();

  const writer = await prisma.user.create({
    data: {
      email: "writer@creator-universe.dev",
      username: "yurino_script",
      displayName: "유리노",
      passwordHash: seedPassword("demo1234"),
      role: UserRole.CREATOR,
      wallet: { create: { currency: "COIN" } },
      creatorProfile: {
        create: {
          primaryRole: MemberRole.WRITER,
          headline: "보이스 드라마와 여성향 세계관 설계에 강한 시나리오 작가",
          bio: "긴 호흡의 감정선과 캐릭터 중심 대사를 잘 다듬습니다.",
          skills: ["시나리오", "대사 각색", "세계관 설계"],
          availabilityNote: "2주 내 합류 가능",
          responseRate: 98,
          followerCount: 3800,
          completedProjects: 18,
          featured: true,
        },
      },
    },
  });

  const illustrator = await prisma.user.create({
    data: {
      email: "illustrator@creator-universe.dev",
      username: "renka_frame",
      displayName: "렌카",
      passwordHash: seedPassword("demo1234"),
      role: UserRole.CREATOR,
      wallet: { create: { currency: "COIN" } },
      creatorProfile: {
        create: {
          primaryRole: MemberRole.ILLUSTRATOR,
          headline: "서브컬처 캐릭터 비주얼과 썸네일 아트 디렉션 전문",
          bio: "라이트노벨 커버와 오디오 드라마 키비주얼을 제작합니다.",
          skills: ["캐릭터 디자인", "표지", "썸네일"],
          availabilityNote: "즉시 가능",
          responseRate: 95,
          followerCount: 8200,
          completedProjects: 24,
          featured: true,
        },
      },
    },
  });

  const voiceActor = await prisma.user.create({
    data: {
      email: "voice@creator-universe.dev",
      username: "haruka_voice",
      displayName: "하루카",
      passwordHash: seedPassword("demo1234"),
      role: UserRole.CREATOR,
      isPartner: true,
      partnerTier: PartnerTier.OFFICIAL_PARTNER,
      wallet: { create: { currency: "COIN" } },
      creatorProfile: {
        create: {
          primaryRole: MemberRole.VOICE_ACTOR,
          headline: "청량한 소녀 톤부터 몽환적인 내레이션까지 소화하는 성우",
          bio: "ASMR, 오디오북, 캐릭터 보이스 샘플을 빠르게 공유합니다.",
          skills: ["캐릭터 보이스", "나레이션", "ASMR"],
          availabilityNote: "이번 주 녹음 슬롯 3개",
          responseRate: 99,
          followerCount: 12400,
          completedProjects: 31,
          featured: true,
          voiceDemoTitle: "Moonlit Monologue Demo",
          voiceDemoDurationSeconds: 102,
          voiceWaveform: [20, 34, 28, 52, 47, 68, 36, 54, 42, 73, 50, 32, 61, 40],
        },
      },
    },
  });

  const reader = await prisma.user.create({
    data: {
      email: "reader@creator-universe.dev",
      username: "reader_one",
      displayName: "리더 원",
      passwordHash: seedPassword("demo1234"),
      role: UserRole.READER,
      wallet: { create: { currency: "COIN" } },
    },
  });

  const project = await prisma.project.create({
    data: {
      id: "project-midnight-signal",
      ownerId: writer.id,
      title: "너의 이름을 부르는 목소리",
      slug: "midnight-signal",
      description: "감정선 중심의 오디오 드라마 프로젝트",
      synopsis: "이름을 잃어버린 두 사람이 밤마다 서로를 듣게 되는 이야기.",
      coverImageUrl: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1200&q=80",
      heroArtworkUrl: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1600&q=80",
      status: ProjectStatus.PUBLISHED,
      priceCoins: 1000,
      isOfficialPartner: false,
      platformFeeRate: 0.15,
      partnerFeeRate: 0.08,
      members: {
        create: [
          {
            userId: writer.id,
            memberRole: MemberRole.WRITER,
            sharePercentage: 30,
          },
          {
            userId: illustrator.id,
            memberRole: MemberRole.ILLUSTRATOR,
            sharePercentage: 30,
          },
          {
            userId: voiceActor.id,
            memberRole: MemberRole.VOICE_ACTOR,
            sharePercentage: 40,
          },
        ],
      },
      episodes: {
        create: {
          title: "Episode 01 · Midnight Signal",
          slug: "midnight-signal-ep01",
          summary: "첫 번째 신호가 울린 밤",
          audioUrl: "https://cdn.example.com/audio/midnight-signal-ep01.mp3",
          artworkUrl: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1200&q=80",
          durationSeconds: 342,
          sequenceNumber: 1,
          isPublished: true,
          publishedAt: new Date(),
          transcriptCues: {
            create: [
              {
                startMs: 0,
                endMs: 5200,
                text: "문이 열리는 순간, 오래된 별빛이 숨을 쉬기 시작했다.",
              },
              {
                startMs: 5201,
                endMs: 10400,
                text: "지금, 너의 이름을 부르는 목소리가 가장 또렷하게 번진다.",
              },
              {
                startMs: 10401,
                endMs: 15600,
                text: "한 걸음 더 다가오면, 잊고 있던 장면들이 파도처럼 깨어난다.",
              },
            ],
          },
        },
      },
    },
  });

  console.log("Seed completed.");
  console.log({
    writerId: writer.id,
    illustratorId: illustrator.id,
    voiceActorId: voiceActor.id,
    readerId: reader.id,
    projectId: project.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
