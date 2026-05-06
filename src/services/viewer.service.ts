import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";

type CreateEpisodeInput = {
  title: string;
  slug: string;
  summary?: string;
  audioUrl: string;
  artworkUrl?: string;
  durationSeconds: number;
  sequenceNumber: number;
  isPublished?: boolean;
  transcriptCues: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }>;
};

export async function createProjectEpisode(projectId: string, actingUserId: string, input: CreateEpisodeInput) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  if (project.ownerId !== actingUserId) {
    throw new AppError("Only the project owner can create episodes.", 403);
  }

  return prisma.projectEpisode.create({
    data: {
      projectId,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      audioUrl: input.audioUrl,
      artworkUrl: input.artworkUrl,
      durationSeconds: input.durationSeconds,
      sequenceNumber: input.sequenceNumber,
      isPublished: input.isPublished ?? false,
      publishedAt: input.isPublished ? new Date() : null,
      transcriptCues: {
        create: input.transcriptCues.map((cue) => ({
          startMs: cue.startMs,
          endMs: cue.endMs,
          text: cue.text,
        })),
      },
    },
    include: {
      transcriptCues: {
        orderBy: { startMs: "asc" },
      },
    },
  });
}

export async function getViewerExperience(projectId: string, userId: string, episodeSlug?: string) {
  const memberAccess = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
      isActive: true,
    },
    select: { id: true },
  });

  const purchasedAccess = await prisma.contentAccess.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    select: { id: true },
  });

  if (!memberAccess && !purchasedAccess) {
    throw new AppError("User does not have access to this project.", 403);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      synopsis: true,
      coverImageUrl: true,
      heroArtworkUrl: true,
      episodes: {
        where: episodeSlug
          ? {
              slug: episodeSlug,
              isPublished: true,
            }
          : {
              isPublished: true,
            },
        orderBy: [{ sequenceNumber: "asc" }],
        include: {
          transcriptCues: {
            orderBy: { startMs: "asc" },
          },
        },
        take: episodeSlug ? 1 : undefined,
      },
    },
  });

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  const episode = episodeSlug ? project.episodes[0] : project.episodes[0];
  if (!episode) {
    throw new AppError("No published episode found for this project.", 404);
  }

  return {
    project: {
      id: project.id,
      title: project.title,
      synopsis: project.synopsis,
      coverImageUrl: project.coverImageUrl,
      heroArtworkUrl: project.heroArtworkUrl,
    },
    episode: {
      id: episode.id,
      title: episode.title,
      slug: episode.slug,
      summary: episode.summary,
      audioUrl: episode.audioUrl,
      artworkUrl: episode.artworkUrl,
      durationSeconds: episode.durationSeconds,
      sequenceNumber: episode.sequenceNumber,
      transcriptCues: episode.transcriptCues,
    },
  };
}
