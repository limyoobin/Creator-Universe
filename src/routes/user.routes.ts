import { MemberRole, PartnerTier, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { createUser, getWalletDetail, getWalletSnapshot } from "../services/user.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";

const creatorProfileSchema = z.object({
  primaryRole: z.nativeEnum(MemberRole),
  headline: z.string().min(1),
  bio: z.string().min(1),
  skills: z.array(z.string()).optional(),
  availabilityNote: z.string().optional(),
  responseRate: z.number().int().min(0).max(100).optional(),
  followerCount: z.number().int().min(0).optional(),
  completedProjects: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
  voiceDemoTitle: z.string().optional(),
  voiceDemoDurationSeconds: z.number().int().positive().optional(),
  voiceWaveform: z.array(z.number().int().positive()).optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2),
  displayName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  isPartner: z.boolean().optional(),
  partnerTier: z.nativeEnum(PartnerTier).optional(),
  creatorProfile: creatorProfileSchema.optional(),
});

export const userRouter = Router();

userRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createUserSchema.parse(req.body);
    const user = await createUser(payload);

    res.status(201).json({
      success: true,
      data: user,
    });
  }),
);

userRouter.get(
  "/me/wallet",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const wallet = await getWalletSnapshot(userId);

    res.json({
      success: true,
      data: wallet,
    });
  }),
);

userRouter.get(
  "/me/wallet/detail",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const wallet = await getWalletDetail(userId);

    res.json({
      success: true,
      data: wallet,
    });
  }),
);
