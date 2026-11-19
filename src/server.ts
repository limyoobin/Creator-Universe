import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { ensureOptionalRootAccount } from "./services/bootstrap.service.js";
import { scheduleKakaoUnlinks } from "./services/kakao-unlink.service.js";

const PORT = Number(process.env.PORT ?? 4000);

await ensureOptionalRootAccount();
scheduleKakaoUnlinks();
const unlinkTimer = setInterval(scheduleKakaoUnlinks, 60_000);
unlinkTimer.unref();

const server = app.listen(PORT, () => {
  console.log(`Creator Universe backend listening on port ${PORT}`);
});

async function shutdown() {
  clearInterval(unlinkTimer);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
