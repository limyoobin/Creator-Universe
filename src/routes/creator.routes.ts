import { MemberRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { deleteCreatorProfile, listCreatorProfiles, upsertCreatorProfile } from "../services/discovery.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";

const querySchema = z.object({
  role: z.nativeEnum(MemberRole).optional(),
  search: z.string().optional(),
  featuredOnly: z.enum(["true", "false"]).optional(),
});

const upsertProfileSchema = z.object({
  primaryRole: z.nativeEnum(MemberRole),
  headline: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(5).max(500),
  skills: z.array(z.string().trim().min(1).max(24)).min(1).max(8),
  availabilityNote: z.string().trim().max(80).optional(),
});

export const creatorRouter = Router();

creatorRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = querySchema.parse(req.query);
    const creators = await listCreatorProfiles({
      role: query.role,
      search: query.search,
      featuredOnly: query.featuredOnly === "true",
    });

    res.json({
      success: true,
      data: creators,
    });
  }),
);

creatorRouter.post(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = upsertProfileSchema.parse(req.body);
    const profile = await upsertCreatorProfile({
      userId,
      ...payload,
    });

    res.status(201).json({
      success: true,
      data: profile,
    });
  }),
);

creatorRouter.delete(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const result = await deleteCreatorProfile(userId);

    res.json({
      success: true,
      data: result,
    });
  }),
);
