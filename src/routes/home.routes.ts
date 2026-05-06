import { Router } from "express";
import { getHomepageSnapshot } from "../services/home.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const homeRouter = Router();

homeRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const snapshot = await getHomepageSnapshot();

    res.json({
      success: true,
      data: snapshot,
    });
  }),
);
