import "dotenv/config";
import { buildApp, prisma } from "./app.js";

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

/**
 * Signal Interrupt 信号编号2，中断信号，通常由用户在终端按下 ‌Ctrl+C‌组合键时产生
 * 主要用于用户主动干预，停止当前正在前台运行的程序
 * 在开发中，捕获 SIGINT 可以实现“优雅退出”，例如在程序退出前保存数据、
 * 关闭数据库连接或清理临时文件，避免数据丢失或资源泄漏。
 */
process.on("SIGINT", () => shutdown("SIGINT"));
/**
 * Signal Terminate 信号编号15，终止信号，这是 kill 命令默认发送的信号
 * 它是系统管理员或自动化脚本停止后台服务的首选信号
 * 与 SIGKILL不同，SIGTERM 可以被进程捕获、阻塞或忽略。
 * 这给了进程一个机会去执行清理工作（如释放锁、刷新缓冲区），因此被称为“优雅终止”
 */
process.on("SIGTERM", () => shutdown("SIGTERM"));

const port = Number(process.env.PORT) || 3000;

try {
  await app.listen({ port, host: "localhost" });
  console.log(`Server is running at http://localhost:${port}`);
} catch (err) {
  console.error("Error starting server:", err);
  process.exit(1);
}
