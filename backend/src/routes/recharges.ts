import type { FastifyInstance } from "fastify";
import z from "zod";
import { adminHook, authHook } from "../utils/auth.js";
import { parseBody, parseQuery } from "../utils/validate.js";
import { ok } from "../utils/response.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { logOperation } from "../utils/operationLog.js";

// schema
const createSchema = z.object({
  amount: z
    .number()
    .positive("充值金额必须大于0")
    .max(1000000, "充值金额不能大于100万"),
  remark: z.string().max(200).optional(),
});

// 批准充值
const approveSchema = z.object({
  approved: z.boolean(),
  remark: z.string().max(200).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

const adminListQuerySchema = listQuerySchema.extend({
  userId: z.coerce.number().int().positive().optional(),
});

// 路由
export async function rechargeRoutes(app: FastifyInstance) {
  // 用户：提交充值申请
  app.post("/", { preHandler: authHook }, async (request, reply) => {
    const payload = parseBody(createSchema, request.body);

    const recharge = await app.prisma.recharge.create({
      data: {
        userId: request.user.id,
        amount: payload.amount,
        status: "PENDING",
        remark: payload.remark ?? null,
      },
    });

    return ok(reply, recharge, 201);
  });

  //   用户：我的充值记录
  app.get("/my", { preHandler: authHook }, async (request, reply) => {
    const query = parseQuery(listQuerySchema, request.query);
    const { page, pageSize, status } = query;

    const where: Record<string, unknown> = { userId: request.user.id };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      app.prisma.recharge.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
      }),
      app.prisma.recharge.count({ where }),
    ]);

    return ok(reply, { list, total });
  });

  //   管理员：充值列表
  app.get(
    "/",
    { preHandler: [authHook, adminHook] },
    async (request, reply) => {
      const query = parseQuery(adminListQuerySchema, request.query);
      const { page, pageSize, status, userId } = query;

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (userId) where.userId = userId;

      const [list, total] = await Promise.all([
        app.prisma.recharge.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { id: "desc" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                balance: true,
              },
            },
          },
        }),
        app.prisma.recharge.count({ where }),
      ]);

      return ok(reply, { list, total });
    },
  );

  //   tpgj ：批准充值
  app.patch(
    "/:id/approve",
    { preHandler: [authHook, adminHook] },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const payload = parseBody(approveSchema, request.body);

      const recharge = await app.prisma.recharge.findUnique({
        where: { id: Number(id) },
      });

      if (!recharge) throw new NotFoundError("充值申请不存在");

      if (recharge.status !== "PENDING") {
        throw new AppError(
          400,
          `该申请已处于${recharge.status}状态, 不可重复审批`,
          "RECHARGE_STATUS_LOCKED",
        );
      }

      //   事务：改状态 + 加余额
      const updated = await app.prisma.$transaction(async (tx) => {
        if (payload.approved) {
          // 通过：给用户加余额
          await tx.user.update({
            where: { id: recharge.userId },
            data: { balance: { increment: recharge.amount } },
          });
        }

        return tx.recharge.update({
          where: { id },
          data: {
            status: payload.approved ? "APPROVED" : "REJECTED",
            remark: payload.remark ?? recharge.remark,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                balance: true,
              },
            },
          },
        });
      });

      await logOperation(app, {
        operatorId: request.user.id,
        action: payload.approved ? "APPROVE_RECHARGE" : "REJECT_RECHARGE",
        targetType: "RECHARGE",
        targetId: id,
        detail: {
          userId: recharge.userId,
          amount: recharge.amount,
          approved: payload.approved,
        },
      });

      return ok(reply, updated);
    },
  );
}
