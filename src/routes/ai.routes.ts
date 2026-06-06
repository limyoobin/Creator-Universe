import { MemberRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { createAiMatchingChat, recommendCreatorsForProject } from "../services/ai-matching.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const matchingRecommendationSchema = z.object({
  projectDescription: z.string().trim().min(5).max(1200),
  preferredRoles: z.array(z.nativeEnum(MemberRole)).max(4).optional(),
  genres: z.array(z.string().trim().min(1).max(24)).max(10).optional(),
  limit: z.number().int().min(1).max(6).optional(),
});

const matchingChatSchema = matchingRecommendationSchema.extend({
  projectDescription: z.string().trim().min(1).max(1200),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .max(12)
    .optional(),
});

export const aiRouter = Router();

aiRouter.post(
  "/matching-recommendations",
  asyncHandler(async (req, res) => {
    const payload = matchingRecommendationSchema.parse(req.body);
    const recommendations = await recommendCreatorsForProject(payload);

    res.json({
      success: true,
      data: recommendations,
    });
  }),
);

aiRouter.post(
  "/matching-chat",
  asyncHandler(async (req, res) => {
    const payload = matchingChatSchema.parse(req.body);
    const response = await createAiMatchingChat(payload);

    res.json({
      success: true,
      data: response,
    });
  }),
);
