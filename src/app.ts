import express from "express";
import { authRouter } from "./routes/auth.routes.js";
import { creatorRouter } from "./routes/creator.routes.js";
import { communityRouter } from "./routes/community.routes.js";
import { homeRouter } from "./routes/home.routes.js";
import { projectRouter } from "./routes/project.routes.js";
import { settlementRouter } from "./routes/settlement.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { viewerRouter } from "./routes/viewer.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://project-limyoobins-projects.vercel.app",
];

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || defaultAllowedOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return process.env.NODE_ENV !== "production" && allowedOrigins.includes("*");
}

app.use((_req, res, next) => {
  const origin = _req.header("origin");

  if (!isAllowedOrigin(origin)) {
    if (_req.method === "OPTIONS") {
      res.sendStatus(403);
      return;
    }

    next();
    return;
  }

  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  } else if (process.env.NODE_ENV !== "production") {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  next();
});

app.options("*", (_req, res) => {
  res.sendStatus(204);
});

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/home", homeRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/creators", creatorRouter);
app.use("/api/projects", projectRouter);
app.use("/api/settlements", settlementRouter);
app.use("/api", communityRouter);
app.use("/api", viewerRouter);

app.use(errorHandler);

export default app;
