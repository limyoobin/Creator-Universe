import { MemberRole, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type CreatorFilter = {
  role?: MemberRole;
  search?: string;
  featuredOnly?: boolean;
};

type UpsertCreatorProfileInput = {
  userId: string;
  primaryRole: MemberRole;
  headline: string;
  bio: string;
  skills: string[];
  availabilityNote?: string;
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
    userId: profile.user.id,
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

export async function upsertCreatorProfile(input: UpsertCreatorProfileInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: { role: UserRole.CREATOR },
      select: {
        id: true,
        username: true,
        displayName: true,
        isPartner: true,
        partnerTier: true,
      },
    });

    const profile = await tx.creatorProfile.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        primaryRole: input.primaryRole,
        headline: input.headline,
        bio: input.bio,
        skills: input.skills,
        availabilityNote: input.availabilityNote,
        responseRate: 100,
        followerCount: 0,
        completedProjects: 0,
        featured: false,
      },
      update: {
        primaryRole: input.primaryRole,
        headline: input.headline,
        bio: input.bio,
        skills: input.skills,
        availabilityNote: input.availabilityNote,
      },
    });

    return {
      id: user.id,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      isPartner: user.isPartner,
      partnerTier: user.partnerTier,
      primaryRole: profile.primaryRole,
      headline: profile.headline,
      bio: profile.bio,
      skills: profile.skills,
      availabilityNote: profile.availabilityNote,
      responseRate: profile.responseRate,
      followerCount: profile.followerCount,
      completedProjects: profile.completedProjects,
      featured: profile.featured,
      voiceDemo: null,
    };
  });
}

export async function deleteCreatorProfile(userId: string) {
  const result = await prisma.creatorProfile.deleteMany({
    where: { userId },
  });

  return {
    deleted: result.count > 0,
  };
}
