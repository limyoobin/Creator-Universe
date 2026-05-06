import { MemberRole, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type CreatorFilter = {
  role?: MemberRole;
  search?: string;
  featuredOnly?: boolean;
};

function buildSearchClause(search?: string): Prisma.CreatorProfileWhereInput | undefined {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { headline: { contains: search, mode: "insensitive" } },
      { bio: { contains: search, mode: "insensitive" } },
      { skills: { has: search } },
      { user: { displayName: { contains: search, mode: "insensitive" } } },
    ],
  };
}

export async function listCreatorProfiles(filter: CreatorFilter) {
  const where: Prisma.CreatorProfileWhereInput = {
    ...(filter.role ? { primaryRole: filter.role } : {}),
    ...(filter.featuredOnly ? { featured: true } : {}),
    ...buildSearchClause(filter.search),
  };

  const creators = await prisma.creatorProfile.findMany({
    where,
    orderBy: [{ featured: "desc" }, { followerCount: "desc" }, { completedProjects: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          isPartner: true,
          partnerTier: true,
        },
      },
    },
  });

  return creators.map((profile) => ({
    id: profile.user.id,
    username: profile.user.username,
    displayName: profile.user.displayName,
    isPartner: profile.user.isPartner,
    partnerTier: profile.user.partnerTier,
    primaryRole: profile.primaryRole,
    headline: profile.headline,
    bio: profile.bio,
    skills: profile.skills,
    availabilityNote: profile.availabilityNote,
    responseRate: profile.responseRate,
    followerCount: profile.followerCount,
    completedProjects: profile.completedProjects,
    featured: profile.featured,
    voiceDemo: profile.voiceDemoTitle
      ? {
          title: profile.voiceDemoTitle,
          durationSeconds: profile.voiceDemoDurationSeconds,
          waveform: profile.voiceWaveform,
        }
      : null,
  }));
}
