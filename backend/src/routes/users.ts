import type { FastifyInstance } from "fastify";
import z from "zod";
import { adminHook, hashPassword } from "../utils/auth.js";
import { parseBody, parseQuery } from "../utils/validate.js";
import { ok } from "../utils/response.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { logOperation } from "../utils/operationLog.js";

//schema
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

const balanceSchema = z.object({
  amount: z.number().refine((value) => value !== 0, "调整金额不能为0"),
  remark: z.string().min(1, "请填写调整原因").max(200),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "密码长度不能小于6位").max(64),
});

// 路由
export async function userRoutes(app: FastifyInstance) {
  // 用户列表
  app.get("/", { preHandler: adminHook }, async (request, reply) => {
    const query = parseQuery(listQuerySchema, request.query);
    const { page, pageSize, keyword, role, status } = query;

    const where: Record<string, unknown> = {};
    // “或”（OR）逻辑的查询条件，满足任一条件为真
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { nickname: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }

    if (role) where.role = role;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      app.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
        // select 用于明确指定查询结果中需要包含哪些字段
        select: {
          id: true,
          username: true,
          nickname: true,
          phone: true,
          role: true,
          balance: true,
          status: true,
          createdAt: true,
          //   _count 是 Prisma 提供的一个特殊聚合功能，用于在查询主表记录的同时，
          // 统计其‌关联表（Relation）‌中的记录数量，而无需单独发起额外的查询
          _count: {
            select: {
              orders: true,
              recharges: true,
              withdraws: true,
            },
          },
        },
      }),
      app.prisma.user.count({ where }),
    ]);

    return ok(reply, {
      list,
      total,
    });
  });

  // 用户详情
  app.get("/:id", { preHandler: adminHook }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    const user = await app.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        phone: true,
        role: true,
        balance: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true, recharges: true, withdraws: true } },
      },
    });
    if (!user) throw new NotFoundError("用户不存在");

    //订单总额
    const orderStatus = await app.prisma.order.aggregate({
      where: { userId: id, status: { in: ["PAID", "DONE"] } },
      _sum: { amount: true },
    });

    return ok(reply, {
      ...user,
      orderAmount: orderStatus._sum.amount || 0,
    });
  });

  // 禁用，启用账号
  app.patch(
    "/:id/status",
    { preHandler: adminHook },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const payload = parseBody(
        z.object({
          status: z.enum(["ACTIVE", "DISABLED"]),
        }),
        request.body,
      );

      //   不能操作自己
      if (id === request.user.id)
        throw new AppError(400, "不能修改自己的状态", "CANNOT_MODIFY_SELF");

      const user = await app.prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundError("用户不存在");

      // 不用禁用其他管理员
      if (user.role === "ADMIN" && payload.status === "DISABLED") {
        throw new AppError(400, "不能禁用管理员", "CANNOT_DISABLE_ADMIN");
      }

      const updated = await app.prisma.user.update({
        where: { id },
        data: { status: payload.status },
        select: {
          id: true,
          username: true,
          nickname: true,
          status: true,
        },
      });

      await logOperation(app, {
        operatorId: request.user.id,
        action: payload.status === "DISABLED" ? "DISABLE_USER" : "ENABLE_USER",
        targetType: "USER",
        targetId: id,
        detail: { username: user.username },
      });

      return ok(reply, updated);
    },
  );

  // 调整余额
  app.post(
    "/:id/balance",
    { preHandler: adminHook },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const payload = parseBody(balanceSchema, request.body);

      // 不能操作管理员
      const user = await app.prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundError("用户不存在");
      if (user.role === "ADMIN") {
        throw new AppError(
          400,
          "不能操作管理员",
          "CANNOT_MODIFY_ADMIN_BALANCE",
        );
      }
      // 调整后不能为负
      if (user.balance + payload.amount < 0) {
        throw new AppError(
          400,
          `调整后余额不能为负，当前余额${user.balance.toFixed(2)}`,
          "BALANCE_WOULD_BE_NEGATIVE",
        );
      }

      const updated = await app.prisma.user.update({
        where: { id },
        data: { balance: { increment: payload.amount } },
        select: {
          id: true,
          username: true,
          nickname: true,
          balance: true,
        },
      });

      await logOperation(app, {
        operatorId: request.user.id,
        action: "ADJUST_BALANCE",
        targetType: "USER",
        targetId: id,
        detail: {
          username: user.username,
          before: user.balance,
          change: payload.amount,
          after: updated.balance,
          remark: payload.remark,
        },
      });

      return ok(reply, updated);
    },
  );

  // 重置密码
  app.post(
    "/:id/reset-password",
    { preHandler: adminHook },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const payload = parseBody(resetPasswordSchema, request.body);

      const user = await app.prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundError("用户不存在");

      const hashed = await hashPassword(payload.newPassword);

      await app.prisma.user.update({
        where: { id },
        data: { password: hashed },
      });

      await logOperation(app, {
        operatorId: request.user.id,
        action: "RESET_PASSWORD",
        targetType: "USER",
        targetId: id,
        detail: { username: user.username },
      });

      return ok(reply, { success: true });
    },
  );
}
