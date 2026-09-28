import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import "./types/index.js";
import authRoutes from "./routes/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db",
});

// 生成一个prisma客户端实例，使用Better SQLite3适配器
export const prisma = new PrismaClient({ adapter });

// 生成一个Fastify应用实例
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, { origin: true });
  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret", // 请在生产环境中使用更安全的方式管理密钥
  });
  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 限制上传文件大小为10MB
    },
  });
  app.register(fastifyStatic, {
    root: path.join(__dirname, "../uploads"),
    prefix: "/uploads/",
  });

  // 将prisma客户端实例挂载到Fastify应用实例上，以便在请求处理过程中使用
  app.decorate("prisma", prisma);

  // 创建检查
  // 给外部系统（负载均衡器、监控平台、容器编排器）判断“这个服务是否还活着”用的信号。返回值本身对人没用，但对机器很关键
  app.get("/api/health", async () => ({ status: "ok", time: new Date() }));

  // 注册路由，后续阶段逐步添加
  app.register(authRoutes, { prefix: "/api/auth" });

  return app;
}
