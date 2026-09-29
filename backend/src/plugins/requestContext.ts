// 给每个请求加一个短ID，方便日志追踪
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export default fp(async function requestContextPlugin(app: FastifyInstance) {
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
});
