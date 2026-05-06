import { Router } from "express";
import { getViewerExperience } from "../services/viewer.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";

export const viewerRouter = Router();

viewerRouter.get(
  "/projects/:projectId/viewer",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const projectId = String(req.params.projectId);
    const experience = await getViewerExperience(
      projectId,
      userId,
      typeof req.query.episodeSlug === "string" ? req.query.episodeSlug : undefined,
    );

    res.json({
      success: true,
      data: experience,
    });
  }),
);
