import type { FastifyInstance } from "fastify";
import z from "zod";
import { adminHook, authHook } from "../utils/auth.js";
import { parseBody, parseQuery } from "../utils/validate.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { ok } from "../utils/response.js";
import { logOperation } from "../utils/operationLog.js";

// schema
const createSchema = z.object({
  amount: z
    .number()
    .positive("提现金额必须大于0")
    .max(10000, "单次提现金额不能超过1万元"),
  channel: z.enum(["BANK", "ALIPAY", "WECHAT", "OTHER"]),
  accountNo: z.string().min(1, "请填写账号").max(100),
  accountName: z.string().max(50).optional(),
  bankName: z.string().max(50).optional(),
  account: z.string().max(200).optional(),
  remark: z.string().max(200).optional(),
});

const approveSchema = z.object({
  approved: z.boolean(),
  remark: z.string().max(200).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

const adminListQuerySchema = listQuerySchema.extend({
  userId: z.coerce.number().int().positive().optional(),
});

// 路由
export async function withdrawRoutes(app: FastifyInstance) {
  // 用户提交提现申请
  app.post("/", { preHandler: authHook }, async (request, reply) => {
    const payload = parseBody(createSchema, request.body);

    // 校验用户余额
    const user = await app.prisma.user.findUnique({
      where: { id: request.user.id }, //必须是唯一字段,返回值‌：匹配的唯一记录对象，或 null
      select: { id: true, balance: true },
    });
    if (!user) throw new NotFoundError("用户不存在");

    if (user.balance < payload.amount) {
      throw new AppError(
        400,
        `余额不足，当前余额为${user.balance.toFixed(2)}`,
        "BALANCE_NOT_ENOUGH",
      );
    }

    // 处理account兼容字段，没传时根据其他字段拼一个人类可读的描述
    const accountTest =
      payload.account ??
      `${payload.channel === "BANK" ? "银行卡" : payload.channel === "ALIPAY" ? "支付宝" : payload.channel === "WECHAT" ? "微信" : "其他"} ${payload.accountNo}`;

    const withdraw = await app.prisma.withdraw.create({
      data: {
        userId: request.user.id,
        amount: payload.amount,
        channel: payload.channel,
        accountNo: payload.accountNo,
        accountName: payload.accountName ?? null,
        bankName: payload.bankName ?? null,
        account: accountTest,
        status: "PENDING",
        remark: payload.remark ?? null,
      },
    });

    return ok(reply, withdraw, 201);
  });

  //   用户，我的提现记录
  app.get("/my", { preHandler: authHook }, async (request, reply) => {
    const query = parseQuery(listQuerySchema, request.query);
    const { page, pageSize, status } = query;

    const where: Record<string, unknown> = { userId: request.user.id };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      app.prisma.withdraw.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
      }),
      app.prisma.withdraw.count({ where }),
    ]);

    return ok(reply, { list, total });
  });

  //   管理员，提现列表
  app.get("/", { preHandler: adminHook }, async (request, reply) => {
    const query = parseQuery(adminListQuerySchema, request.query);
    const { page, pageSize, status, userId } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [list, total] = await Promise.all([
      app.prisma.withdraw.findMany({
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
      app.prisma.withdraw.count({ where }),
    ]);

    return ok(reply, { list, total });
  });

  //   管理员，提现审核
  app.patch(
    "/:id/approve",
    { preHandler: adminHook },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const payload = parseBody(approveSchema, request.body);

      const withdraw = await app.prisma.withdraw.findUnique({
        where: { id: Number(id) },
      });
      if (!withdraw) throw new NotFoundError("提现记录不存在");

      if (withdraw.status !== "PENDING") {
        throw new AppError(
          400,
          `该申请已处于${withdraw.status}状态, 暂不可重复处理`,
          "WITHDRAW_ALREADY_PROCESSED",
        );
      }

      //   审批通过时，二次校验余额
      if (payload.approved) {
        const user = await app.prisma.user.findUnique({
          where: { id: withdraw.userId },
          select: { balance: true },
        });
        if (!user) throw new NotFoundError("用户不存在");

        if (user.balance < withdraw.amount) {
          throw new AppError(
            400,
            `用户余额不足，当前余额为${user.balance.toFixed(2)}`,
            "BALANCE_NOT_ENOUGH",
          );
        }
      }

      //   事务：改状态 + 扣余额
      const updated = await app.prisma.$transaction(async (tx) => {
        if (payload.approved) {
          // 通过：给用户减余额
          await tx.user.update({
            where: { id: withdraw.userId },
            data: { balance: { decrement: withdraw.amount } },
          });
        }

        return tx.withdraw.update({
          where: { id },
          data: {
            status: payload.approved ? "APPROVED" : "REJECTED",
            remark: payload.remark ?? withdraw.remark,
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
        action: payload.approved ? "APPROVE_WITHDRAW" : "REJECT_WITHDRAW",
        targetType: "WITHDRAW",
        targetId: id,
        detail: {
          userId: withdraw.userId,
          amount: withdraw.amount,
          approved: payload.approved,
        },
      });

      return ok(reply, updated);
    },
  );
}
