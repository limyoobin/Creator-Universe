import { ProjectStatus, TransactionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { decimalToNumber, toDecimal } from "../utils/decimal.js";

export async function getHomepageSnapshot() {
  const [creatorProfiles, projects, transactionAggregate] = await Promise.all([
    prisma.creatorProfile.findMany({
      where: { featured: true },
      take: 6,
      orderBy: [{ followerCount: "desc" }, { completedProjects: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { status: ProjectStatus.PUBLISHED },
      take: 6,
      orderBy: [{ totalRevenueAmount: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        synopsis: true,
        coverImageUrl: true,
        priceCoins: true,
        isOfficialPartner: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.PAID,
      },
      _sum: {
        grossAmount: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  return {
    featuredCreators: creatorProfiles.map((profile) => ({
      id: profile.user.id,
      displayName: profile.user.displayName,
      username: profile.user.username,
      primaryRole: profile.primaryRole,
      headline: profile.headline,
      skills: profile.skills,
      voiceWaveform: profile.voiceWaveform,
    })),
    featuredProjects: projects,
    platformStats: {
      totalPaidTransactions: transactionAggregate._count.id,
      totalGrossRevenue: decimalToNumber(transactionAggregate._sum.grossAmount ?? toDecimal(0)),
    },
  };
}
