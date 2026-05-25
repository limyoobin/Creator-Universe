import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import { PUBLIC_UPLOAD_PATH, UPLOAD_ROOT } from "../constants/uploads.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";
import { AppError } from "../errors/app-error.js";

const uploadKindSchema = z.enum(["audio", "image", "document"]);

const uploadSchema = z.object({
  kind: uploadKindSchema,
  originalName: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(120),
  dataUrl: z.string().min(1),
});

const allowedMimeTypes: Record<z.infer<typeof uploadKindSchema>, string[]> = {
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
    "video/mp4",
  ],
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  document: [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

const maxBytesByKind: Record<z.infer<typeof uploadKindSchema>, number> = {
  audio: 25 * 1024 * 1024,
  image: 8 * 1024 * 1024,
  document: 10 * 1024 * 1024,
};

const fallbackExtensions: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "video/mp4": ".m4a",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "application/json": ".json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,([a-zA-Z0-9+/=\r\n]+)$/);

  if (!match) {
    throw new AppError("Invalid file payload. Use a base64 data URL.", 422);
  }

  return {
    mimeType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64"),
  };
}

function sanitizeExtension(originalName: string, mimeType: string) {
  const extension = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "");

  if (extension && extension.length <= 10) {
    return extension;
  }

  return fallbackExtensions[mimeType] ?? ".bin";
}

function getPublicBaseUrl(req: Request) {
  const configured = process.env.PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

export const uploadRouter = Router();

uploadRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = uploadSchema.parse(req.body);
    const parsed = parseDataUrl(payload.dataUrl);
    const claimedMimeType = payload.mimeType.toLowerCase();
    const effectiveMimeType = parsed.mimeType === "application/octet-stream" ? claimedMimeType : parsed.mimeType;

    if (parsed.mimeType !== claimedMimeType && parsed.mimeType !== "application/octet-stream") {
      throw new AppError("File MIME type does not match the uploaded payload.", 422);
    }

    if (!allowedMimeTypes[payload.kind].includes(effectiveMimeType)) {
      throw new AppError("This file type is not supported for the selected upload category.", 415);
    }

    if (parsed.buffer.byteLength > maxBytesByKind[payload.kind]) {
      throw new AppError("File is too large for this upload category.", 413);
    }

    const uploadId = crypto.randomUUID();
    const extension = sanitizeExtension(payload.originalName, effectiveMimeType);
    const directory = path.join(UPLOAD_ROOT, payload.kind, userId);
    const filename = `${Date.now()}-${uploadId}${extension}`;
    const storagePath = path.join(directory, filename);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(storagePath, parsed.buffer);

    const publicPath = `${PUBLIC_UPLOAD_PATH}/${payload.kind}/${encodeURIComponent(userId)}/${encodeURIComponent(filename)}`;

    res.status(201).json({
      success: true,
      data: {
        id: uploadId,
        kind: payload.kind,
        originalName: payload.originalName,
        mimeType: effectiveMimeType,
        sizeBytes: parsed.buffer.byteLength,
        publicPath,
        url: `${getPublicBaseUrl(req)}${publicPath}`,
      },
    });
  }),
);
