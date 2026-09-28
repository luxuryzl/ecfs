// 给每个请求加一个短ID，方便日志追踪

import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

export async function requestContextPlugin(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    const requestId =
      (request.headers["x-request-id"] as string) ?? randomUUID().slice(0, 8);
    request.id = requestId;
    reply.header("x-request-id", requestId);
  });
}
