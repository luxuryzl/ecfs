import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { env } from "./utils/env.js";
import errorHandlerPlugin from "./plugins/errorHandler.js";
import requestContextPlugin from "./plugins/requestContext.js";
import "./types/index.js";

import { authRoutes } from "./routes/auth.js";

import { randomUUID } from "crypto";

import { groupRoutes } from "./routes/groups.js";
import { productsRoutes } from "./routes/products.js";
import { orderRoutes } from "./routes/order.js";
import { rechargeRoutes } from "./routes/recharges.js";
import { withdrawRoutes } from "./routes/withdraw.js";
import { userRoutes } from "./routes/users.js";
import { noticeRoutes } from "./routes/notices.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { uploadRoutes } from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db",
});

// 生成一个prisma客户端实例，使用Better SQLite3适配器
export const prisma = new PrismaClient({
  adapter,
  omit: {
    user: { password: true }, // 全局排除password
  },
});

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
      : {
          level: "info",
          transport: {
            target: "pino/file",
            options: { destination: "./logs/app.log", mkdir: true },
          },
        };

  const app = Fastify({
    logger: loggerConfig,
    genReqId: (req) => {
      const header = req.headers["x-request-id"];
      const value = Array.isArray(header) ? header[0] : header;
      return value ?? randomUUID().slice(0, 8);
    },
  });

  // 插件
  // 1.请求上下文（最先，因为要给所有请求加 reqId）
  await app.register(requestContextPlugin);
  // 2.错误处理（要在业务路由前，否则捕获不到）
  await app.register(errorHandlerPlugin);
  // 3.cors
  await app.register(cors, {
    origin: env.NODE_ENV === "production" ? ["https://your-domain.com"] : true,
    exposedHeaders: ["x-request-id"],
  });
  // 安全头：helmet 放 cors 之后、jwt 之前
  await app.register(helmet, { contentSecurityPolicy: false }); //对纯 API 后端，关掉 CSP 是标准做法
  // 限流：每个IP每15分钟最多访问100次
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "15 minutes",
  });
  // 4.jwt
  await app.register(jwt, { secret: env.JWT_SECRET });
  // 5.multipart
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 限制上传文件大小为5MB
    },
  });
  // 6.静态服务
  await app.register(fastifyStatic, {
    root: path.join(__dirname, "../uploads"),
    prefix: "/uploads/",
  });

  // 将prisma客户端实例挂载到Fastify应用实例上，以便在请求处理过程中使用
  app.decorate("prisma", prisma as any);

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
  await app.register(authRoutes, { prefix: "/api/auth" });
  // 注册分组路由
  await app.register(groupRoutes, { prefix: "/api/groups" });
  //注册商品路由
  await app.register(productsRoutes, { prefix: "/api/products" });
  // 注册订单路由
  await app.register(orderRoutes, { prefix: "/api/orders" });
  // 注册充值路由
  await app.register(rechargeRoutes, { prefix: "/api/recharges" });
  // 注册提现路由
  await app.register(withdrawRoutes, { prefix: "/api/withdraws" });
  // 注册用户路由
  await app.register(userRoutes, { prefix: "/api/users" });
  // 注册公告路由
  await app.register(noticeRoutes, { prefix: "/api/notices" });
  // 注册图表路由
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
  // 注册上传路由
  await app.register(uploadRoutes, { prefix: "/api/upload" });
  return app;
}
