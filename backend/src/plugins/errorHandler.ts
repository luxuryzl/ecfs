/**
 * Fastify 插件，统一处理所有抛出的错误。
 */
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler(
    (error: FastifyError | AppError | ZodError, request, reply) => {
      // 处理 Zod 验证错误
      if (error instanceof ZodError) {
        const first = error.issues[0];
        return reply.status(400).send({
          success: false,
          message: first
            ? `${first.path.join(".")}: ${first.message}`
            : "参数错误",
          code: "VALIDATION_ERROR",
        });
      }

      //业务错误
      if (error instanceof AppError) {
        // 4XX用warn，5XX用error
        const logMethod = error.statusCode >= 500 ? "error" : "warn";
        request.log[logMethod](
          { err: error, reqId: request.id },
          `${error.statusCode} ${error.message}`,
        );

        return reply.code(error.statusCode).send({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      // Fastify 自带错误，如400，404
      if (error.statusCode && error.statusCode < 500) {
        return reply.code(error.statusCode).send({
          success: false,
          message: error.message,
          code: error.code ?? "CLIENT_ERROR",
        });
      }

      // 未知错误
      request.log.error(
        { err: error, reqId: request.id, stack: error.stack },
        "未处理的服务端错误，Unhandled error",
      );

      return reply.code(500).send({
        success: false,
        message:
          process.env.NODE_ENV === "production"
            ? "服务器内部错误"
            : error.message, // 生产环境只返回服务器内部错误，开发环境返回原始错误信息
        code: "INTERNAL_SERVER_ERROR",
      });
    },
  );

  //   404兜底
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      message: `路由不存在：${request.method} ${request.url}`,
      code: "ROUTE NOT_FOUND",
    });
  });
});
