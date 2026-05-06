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

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
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
