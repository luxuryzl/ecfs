import type { FastifyInstance } from "fastify";
import z from "zod";
import { adminHook, authHook } from "../utils/auth.js";
import { parseBody, parseQuery } from "../utils/validate.js";
import { AppError, ForbiddenError, NotFoundError } from "../utils/errors.js";
import {
  generateOrderNo,
  generateSupplementOrderNo,
} from "../utils/orderNo.js";
import { ok } from "../utils/response.js";
import { logOperation } from "../utils/operationLog.js";

// schema
const createOrderSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().max(9999),
  remark: z.string().max(200).optional(),
});

const supplementSchema = z.object({
  amount: z.number().positive("补差金额必须大于0"),
  remark: z.string().max(200).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["PENDING", "PAID", "CANCELLED", "DONE"]).optional(),
  type: z.enum(["NORMAL", "SUPPLEMENT", "REFUND"]).optional(),
  keyword: z.string().max(20).optional(),
});

const adminListQuerySchema = listQuerySchema.extend({
  userId: z.coerce.number().int().positive().optional(), //不加coerce就只能验证数字，加了可以验证 number、string、boolean 等
});

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "CANCELLED", "DONE"]),
  remark: z.string().max(200).optional(),
});

// 路由
export async function orderRoutes(app: FastifyInstance) {
  // 用户下单
  app.post("/", { preHandler: authHook }, async (request, reply) => {
    const payload = parseBody(createOrderSchema, request.body);
    const userId = request.user.id;

    // 1.查商品
    const product = await app.prisma.product.findUnique({
      where: { id: payload.productId },
    });
    if (!product) throw new NotFoundError("商品不存在");
    if (product.status !== "ON")
      throw new AppError(400, "商品已下架", "PRODUCT_OFFLINE");
    if (product.stock < payload.quantity)
      throw new AppError(
        400,
        `商品库存不足，当前仅剩${product.stock}件`,
        "PRODUCT_STOCK_NOT_ENOUGH",
      );

    // 2.计算总价
    // toFixed(2)是自动四舍五入（注意：是“银行家舍入法”）
    const amount = Number((product.price * payload.quantity).toFixed(2));

    // 3.查用户余额
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundError("用户不存在");
    if (user.balance < amount)
      throw new AppError(
        400,
        `余额不足，当前余额${user.balance.toFixed(2)}，需要${amount.toFixed(2)}`,
        "USER_BALANCE_NOT_ENOUGH",
      );

    // 4.事务：扣库存，扣余额，创建订单，
    // tx是transaction的缩写,是 Prisma 传给你的「事务专用客户端」,tx 内的所有操作共享同一个事务
    const order = await app.prisma.$transaction(async (tx) => {
      // 4.1 扣库存，用update的decrement ，保证原子性，如果是增加用increment
      await tx.product.update({
        where: { id: payload.productId },
        data: { stock: { decrement: payload.quantity } },
      });

      // 4.2 扣余额
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
      });

      // 4.3 创建订单
      return tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          type: "NORMAL",
          userId,
          productId: product.id,
          quantity: payload.quantity,
          amount,
          status: "PENDING",
          remark: payload.remark ?? null,
        },
        include: { product: true, user: true }, // 订单关联着商品和用户
      });
    });

    return ok(reply, order, 201); //201 是 HTTP 状态码，表示「Created（已创建），新建资源成功
  });

  //   用户，我的订单列表
  app.get("/my", { preHandler: authHook }, async (request, reply) => {
    const query = parseQuery(listQuerySchema, request.query);
    const { page, pageSize, status, type, keyword } = query;
    const userId = request.user.id;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (keyword) where.orderNo = { contains: keyword };

    const [list, total] = await Promise.all([
      app.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
        include: { product: true, children: true },
      }),
      app.prisma.order.count({ where }),
    ]);

    return ok(reply, { list, total });
  });

  //   管理员，全部订单列表
  app.get("/", { preHandler: adminHook }, async (request, reply) => {
    const query = parseQuery(adminListQuerySchema, request.query);
    const { page, pageSize, status, type, keyword, userId } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (keyword) where.orderNo = { contains: keyword };

    const [list, total] = await Promise.all([
      app.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
        include: { product: true, user: true, children: true },
      }),
      app.prisma.order.count({ where }),
    ]);

    return ok(reply, { list, total });
  });

  // 订单详情，用户看自己的，管理员看所有
  app.get("/:id", { preHandler: authHook }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    const order = await app.prisma.order.findUnique({
      where: { id },
      include: {
        product: true,
        user: { select: { id: true, username: true, nickname: true } },
        parent: true,
        children: true,
      },
    });
    if (!order) throw new NotFoundError("订单不存在");

    // 普通用户只能看自己
    if (request.user.role !== "ADMIN" && order.userId !== request.user.id) {
      throw new ForbiddenError("无权限访问该订单");
    }

    return ok(reply, order);
  });

  // 修改订单状态，管理员
  app.patch(
    "/:id/status",
    { preHandler: adminHook },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const payload = parseBody(updateStatusSchema, request.body);

      const exist = await app.prisma.order.findUnique({
        where: { id },
      });
      if (!exist) throw new NotFoundError("订单不存在");

      // 订单流转校验：已取消和已完成的不能修改状态
      if (exist.status === "CANCELED" || exist.status === "DONE") {
        throw new AppError(
          400,
          "订单已处于「${exist.status}」状态，不能进行状态修改",
          "ORDER_STATUS_LOCKED",
        );
      }

      const order = await app.prisma.order.update({
        where: { id },
        data: {
          status: payload.status,
          ...(payload.remark !== undefined ? { remark: payload.remark } : {}),
        },
        include: { product: true, user: true },
      });

      await logOperation(app, {
        operatorId: request.user.id,
        action: "UPDATE_ORDER_STATUS",
        targetType: "ORDER",
        targetId: order.id,
        detail: {
          from: exist.status,
          to: payload.status,
          orderNo: order.orderNo,
        },
      });

      return ok(reply, order);
    },
  );

  // 管理员：为主订单创建补差单
  app.post(
    "/:id/supplement",
    { preHandler: adminHook },
    async (request, reply) => {
      const mainOrderId = Number((request.params as { id: string }).id);
      const payload = parseBody(supplementSchema, request.body);

      // 1. 校验主订单存在且是Normal类型
      const mainOrder = await app.prisma.order.findUnique({
        where: { id: mainOrderId },
        include: { children: true },
      });
      if (!mainOrder) throw new NotFoundError("主订单不存在");
      if (mainOrder.type !== "NORMAL") {
        throw new AppError(400, "只能对普通订单创建补差单", "NOT_NORMAL_ORDER");
      }
      if (mainOrder.status === "CANCELED") {
        throw new AppError(
          400,
          "已取消的订单不能创建补差单",
          "ORDER_CANCELLED",
        );
      }

      // 2.用户余额校验
      const user = await app.prisma.user.findUnique({
        where: { id: mainOrder.userId },
      });
      if (!user) throw new NotFoundError("用户不存在");
      if (user.balance < payload.amount) {
        throw new AppError(
          400,
          `用户余额不足，当前${user.balance}，补差金额$${payload.amount}，请充值`,
          "USER_BALANCE_NOT_ENOUGH",
        );
      }

      // 3. 计算子订单序号
      const seq = mainOrder.children.length + 1;
      const supplementNo = generateSupplementOrderNo(mainOrder.orderNo, seq);

      // 4. 事务：扣余额 + 创建补差单
      const supplement = await app.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: payload.amount } },
        });

        return tx.order.create({
          data: {
            orderNo: supplementNo,
            parentId: mainOrder.id,
            type: "SUPPLEMENT",
            userId: mainOrder.userId,
            productId: mainOrder.productId,
            quantity: 1,
            amount: payload.amount,
            status: "PAID", //补差订单目前直接视为已支付
            remark: payload.remark ?? "补差价",
          },
          include: { product: true, user: true },
        });
      });

      await logOperation(app, {
        operatorId: request.user.id,
        action: "CREATE_SUPPLEMENT_ORDER",
        targetType: "ORDER",
        targetId: supplement.id,
        detail: {
          mainOrderNo: mainOrder.orderNo,
          supplementNo,
          amount: payload.amount,
        },
      });

      return ok(reply, supplement, 201);
    },
  );

  // 用户取消自己的订单，仅pending可取消
  app.post("/:id/cancel", { preHandler: authHook }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    const order = await app.prisma.order.findUnique({
      where: { id },
    });
    if (!order) throw new NotFoundError("订单不存在");

    // 用户只能取消自己的订单
    if (request.user.role !== "ADMIN" && order.userId !== request.user.id) {
      throw new ForbiddenError("无权操作该订单");
    }
    if (order.status !== "PENDING") {
      throw new AppError(
        400,
        "只有待处理的订单可以取消，当前订单已处于「${order.status}」状态，不能取消",
        "ORDER_CANNOT_CANCEL",
      );
    }

    // 事务：退余额 + 退库存 + 改状态
    const canceled = await app.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: order.userId },
        data: { balance: { increment: order.amount } },
      });

      await tx.product.update({
        where: { id: order.productId },
        data: { stock: { increment: order.quantity } },
      });

      return tx.order.update({
        where: { id },
        data: { status: "CANCELED", remark: "用户取消" },
      });
    });

    return ok(reply, canceled);
  });
}
