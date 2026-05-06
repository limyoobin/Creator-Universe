import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { ensureOptionalRootAccount } from "./services/bootstrap.service.js";

const PORT = Number(process.env.PORT ?? 4000);

await ensureOptionalRootAccount();

const server = app.listen(PORT, () => {
  console.log(`Creator Universe backend listening on port ${PORT}`);
});

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
