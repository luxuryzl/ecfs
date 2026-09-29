/**
 * 统一响应格式，风格统一，前端处理更省心，约定：
 * 成功 {success: true, data: ...}
 * 失败{success: false, message: '...', code: '...'}
 *
 */

import type { FastifyReply } from "fastify";

export function ok<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.code(statusCode).send({
    success: true,
    data,
  });
}

export function fail(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  code?: string,
) {
  return reply.code(statusCode).send({
    success: false,
    message,
    code,
  });
}
