import { MemberRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { listCreatorProfiles } from "../services/discovery.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const querySchema = z.object({
  role: z.nativeEnum(MemberRole).optional(),
  search: z.string().optional(),
  featuredOnly: z.enum(["true", "false"]).optional(),
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
