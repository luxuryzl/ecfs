import "dotenv/config";
import { buildApp, prisma } from "./app.js";
import { env } from "./utils/env.js";

const app = await buildApp();

async function shutdown(signal: string) {
  app.log.info(`收到 ${signal}, 正在关闭...`);
  try {
    await app.close();
    await prisma.$disconnect();
    app.log.info("已关闭");
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "关闭失败");
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const port = Number(process.env.PORT) || 3000;

try {
  await app.listen({ port, host: "localhost" });
  console.log(`Server is running at http://localhost:${port}`);
} catch (err) {
  console.error("Error starting server:", err);
  process.exit(1);
}
