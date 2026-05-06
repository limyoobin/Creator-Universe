import type { Request } from "express";
import { AppError } from "../errors/app-error.js";
import { getUserIdBySessionToken } from "../services/auth.service.js";
import { getBearerToken } from "./token.js";

export async function getCurrentUserId(req: Request) {
  const bearerToken = getBearerToken(req);
  if (bearerToken) {
    const userId = await getUserIdBySessionToken(bearerToken);
    if (userId) {
      return userId;
    }
  }

  const headerUserId = req.header("x-user-id");
  const bodyUserId = typeof req.body?.buyerId === "string" ? req.body.buyerId : undefined;
  const queryUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;

  const userId = headerUserId ?? bodyUserId ?? queryUserId;

  if (!userId) {
    throw new AppError("User context is required. Pass x-user-id header or userId.", 401);
  }

  return userId;
}

export async function getOptionalCurrentUserId(req: Request) {
  try {
    return await getCurrentUserId(req);
  } catch {
    return undefined;
  }
}
