import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { env } from "./utils/env.js";
import errorHandlerPlugin from "./plugins/errorHandler.js";
import requestContextPlugin from "./plugins/requestContext.js";
import "./types/index.js";

import authRoutes from "./routes/auth.js";

import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db",
});

// 生成一个prisma客户端实例，使用Better SQLite3适配器
export const prisma = new PrismaClient({ adapter });

// 生成一个Fastify应用实例
export async function buildApp(): Promise<FastifyInstance> {
  const loggerConfig =
    env.NODE_ENV === "development"
      ? {
          level: "debug",
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss",
              ignore: "pid,hostname",
            }, //避免日志中的中文乱码
          },
        }
      : { level: "info" };

  const app = Fastify({
    logger: loggerConfig,
    genReqId: (req) => {
      const header = req.headers["x-request-id"];
      const value = Array.isArray(header) ? header[0] : header;
      return value ?? randomUUID().slice(0, 8);
    },
  });

  // 插件
  await app.register(requestContextPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(cors, { origin: true, exposedHeaders: ["x-request-id"] });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 限制上传文件大小为5MB
    },
  });
  await app.register(fastifyStatic, {
    root: path.join(__dirname, "../uploads"),
    prefix: "/uploads/",
  });

  // 将prisma客户端实例挂载到Fastify应用实例上，以便在请求处理过程中使用
  app.decorate("prisma", prisma);

  // 创建检查
  // 给外部系统（负载均衡器、监控平台、容器编排器）判断“这个服务是否还活着”用的信号。返回值本身对人没用，但对机器很关键
  app.get("/api/health", async (request, reply) => ({
    success: true,
    data: {
      status: "ok",
      time: new Date().toISOString(),
      env: env.NODE_ENV,
    },
  }));

  // 注册路由，后续阶段逐步添加
  // await app.register(authRoutes, { prefix: "/api/auth" });

  return app;
}
