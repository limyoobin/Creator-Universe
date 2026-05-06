import { MemberRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { createProjectWithMembers, getProjectDetail, getProjectSettlementDashboard } from "../services/project.service.js";
import { createProjectEpisode } from "../services/viewer.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId, getOptionalCurrentUserId } from "../utils/request-context.js";

const memberSchema = z.object({
  userId: z.string().min(1),
  memberRole: z.nativeEnum(MemberRole),
  sharePercentage: z.number().positive(),
  settlementAccount: z.string().optional(),
});

const createProjectSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  synopsis: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  heroArtworkUrl: z.string().url().optional(),
  priceCoins: z.number().int().positive().optional(),
  isOfficialPartner: z.boolean().optional(),
  platformFeeRate: z.number().positive().max(1).optional(),
  partnerFeeRate: z.number().positive().max(1).optional(),
  members: z.array(memberSchema).min(1),
});

const createEpisodeSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().optional(),
  audioUrl: z.string().url(),
  artworkUrl: z.string().url().optional(),
  durationSeconds: z.number().int().positive(),
  sequenceNumber: z.number().int().positive(),
  isPublished: z.boolean().optional(),
  transcriptCues: z
    .array(
      z
        .object({
          startMs: z.number().int().min(0),
          endMs: z.number().int().positive(),
          text: z.string().min(1),
        })
        .refine((cue) => cue.endMs > cue.startMs, {
          message: "endMs must be greater than startMs.",
          path: ["endMs"],
        }),
    )
    .min(1),
});

export const projectRouter = Router();

projectRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const ownerId = await getCurrentUserId(req);
    const payload = createProjectSchema.parse(req.body);
    const project = await createProjectWithMembers(ownerId, payload);

    res.status(201).json({
      success: true,
      data: project,
    });
  }),
);

projectRouter.get(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const currentUserId = await getOptionalCurrentUserId(req);
    const projectId = String(req.params.projectId);
    const project = await getProjectDetail(projectId, currentUserId);

    res.json({
      success: true,
      data: project,
    });
  }),
);

projectRouter.get(
  "/:projectId/settlement-dashboard",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const projectId = String(req.params.projectId);
    const dashboard = await getProjectSettlementDashboard(
      projectId,
      userId,
      typeof req.query.month === "string" ? `${req.query.month}-01` : undefined,
    );

    res.json({
      success: true,
      data: dashboard,
    });
  }),
);

projectRouter.post(
  "/:projectId/episodes",
  asyncHandler(async (req, res) => {
    const actingUserId = await getCurrentUserId(req);
    const projectId = String(req.params.projectId);
    const payload = createEpisodeSchema.parse(req.body);
    const episode = await createProjectEpisode(projectId, actingUserId, payload);

    res.status(201).json({
      success: true,
      data: episode,
    });
  }),
);
