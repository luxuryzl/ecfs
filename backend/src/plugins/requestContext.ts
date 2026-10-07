// 给每个请求加一个短ID，方便日志追踪
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { url } from "node:inspector";

export default fp(async function requestContextPlugin(app: FastifyInstance) {
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  // 请求耗时日志
  app.addHook("onResponse", async (request, reply) => {
    const responseTime = reply.elapsedTime; //响应时间等于已过去的时间
    // 慢请求告警：超过1秒
    if (responseTime > 1000) {
      request.log.warn(
        {
          reqId: request.id,
          method: request.method,
          url: request.url,
          responseTime,
          statusCode: reply.statusCode,
        },
        "慢请求",
      );
    }

    // 5XX 错误告警
    if (reply.statusCode >= 500) {
      request.log.error(
        {
          reqId: request.id,
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
        },
        "服务器错误",
      );
    }
  });
});
