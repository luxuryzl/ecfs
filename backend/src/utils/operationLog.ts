import type { FastifyInstance } from "fastify";

interface LogOptions {
  operatorId: number;
  action: string;
  targetType: string;
  targetId?: number;
  detail?: Record<string, unknown>;
}

export async function logOperation(
  app: FastifyInstance,
  options: LogOptions,
): Promise<void> {
  try {
    await app.prisma.operationLog.create({
      data: {
        operatorId: options.operatorId,
        action: options.action,
        targetType: options.targetType,
        targetId: options.operatorId ?? null,
        detail: options.detail ? JSON.stringify(options.detail) : null,
      },
    });
  } catch (err) {
    app.log.error({ err, options }, "操作日志定稿失败");
  }
}
