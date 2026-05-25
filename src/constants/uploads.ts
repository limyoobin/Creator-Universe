import path from "node:path";

export const PUBLIC_UPLOAD_PATH = "/uploads";

export const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"),
);
