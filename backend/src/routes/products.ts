import type { FastifyInstance } from "fastify";
import z from "zod";
import { adminHook, authHook } from "../utils/auth.js";
import { parseBody, parseQuery } from "../utils/validate.js";
import { ok } from "../utils/response.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { logOperation } from "../utils/operationLog.js";

// schema
const createSchema = z.object({
  name: z
    .string()
    .min(1, "商品名称不能为空")
    .max(50, "商品名称不能超过50个字符"),
  description: z.string().max(500, "商品描述不能超过500个字符").optional(),
  price: z.number().positive().min(1).max(999999999, "价格不能超过999999999"),
  stock: z
    .number()
    .int()
    .min(0, "库存不能为负数")
    .max(999999999, "库存不能超过999999999"),
  image: z.string().max(500).optional(),
  groupId: z.number().int().positive().nullable().optional(),
  status: z.enum(["ON", "OFF"]).optional(),
});

// 基于 createSchema 定义的原始数据结构，创建一个所有字段都变为“可选”的新 Schema，通常用于处理“部分更新”的场景
const updateSchema = createSchema.partial();

// product 需要，因为它有分页、搜索、筛选，这些参数必须校验（防止 pageSize 过大、status 非法值等问题）。
// 后续每个模块都按这个标准判断——有输入就校验
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().optional(), //作用是‌定义一个用于搜索或过滤的可选文本字段‌,模糊搜索/关键词过滤
  groupId: z.coerce.number().int().positive().optional(),
  status: z.enum(["ON", "OFF"]).optional(),
});

// 路由
export async function productsRoutes(app: FastifyInstance) {
  // 列表，登录用户可见，支持分页，搜索，筛选
  app.get("/", { preHandler: authHook }, async (req, reply) => {
    const query = parseQuery(listQuerySchema, req.query);
    const { page, pageSize, keyword, groupId, status } = query;

    // where 是 Prisma 查询的筛选条件对象。Prisma 的
    // findMany、count、updateMany 等查询，都接受一个 where 参数，用来指定「查哪些行」
    const where: Record<string, unknown> = {};
    // TS 内置的工具类型，Record<string, unknown> 表示一个‌灵活的字典对象‌，它的键只能是字符串，值可以是任何东西，但在使用值之前必须进行类型检查。
    // 这种写法在处理‌动态表单、API 参数、数据库查询条件‌等结构不固定的数据时非常有用，既提供了灵活性，又比 any 更安全。
    if (keyword) where.name = { contains: keyword }; //name就是product表中的name字段
    //contains 是 Prisma 的内置查询操作符。当你对一个 String 类型字段做筛选时，Prisma 支持
    // equals,startswith,,endswith,in,notIn等，生成WHERE name LIKE '%keyword%'
    if (groupId) where.groupId = groupId;
    if (status) where.status = status;

    // 同时执行多个 Promise，等全部完成。这里面包含了查list和查total，并行执行，比一个一个查要快
    const [list, total] = await Promise.all([
      // 查list
      app.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize, //跳过前面几页
        take: pageSize,
        orderBy: { id: "desc" }, //按 id 倒序
        include: { group: true }, //连带查询关联的数据。LEFT JOIN Group ON Product.groupId = Group.id
      }),
      // 查total
      app.prisma.product.count({ where }),
    ]);

    return ok(reply, { list, total });
  });

  // 详情
  app.get("/:id", { preHandler: authHook }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const product = await app.prisma.product.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!product) throw new NotFoundError("商品不存在");
    return ok(reply, product);
  });

  // 新增（管理员）
  app.post("/", { preHandler: adminHook }, async (req, reply) => {
    const payload = parseBody(createSchema, req.body);

    // 若指定了分组，校验分组是否存在
    if (payload.groupId) {
      const group = await app.prisma.group.findUnique({
        where: { id: payload.groupId },
      });
      if (!group) throw new AppError(400, "分组不存在", "GROUP_NOT_FOUND");
    }

    const product = await app.prisma.product.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        price: payload.price,
        stock: payload.stock,
        image: payload.image ?? null,
        groupId: payload.groupId ?? null,
        status: payload.status ?? "ON",
      },
      include: { group: true },
    });
    await logOperation(app, {
      operatorId: req.user.id,
      action: "CREATE_PRODUCT",
      targetType: "PRODUCT",
      targetId: product.id,
      detail: { name: product.name, price: product.price },
    });

    return ok(reply, product, 201);
  });

  // 修改（管理员）
  app.put("/:id", { preHandler: adminHook }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const payload = parseBody(updateSchema, req.body);

    const exist = await app.prisma.product.findUnique({
      where: { id },
    });

    if (!exist) throw new NotFoundError("商品不存在");

    if (payload.groupId) {
      const group = await app.prisma.group.findUnique({
        where: { id: payload.groupId },
      });
      if (!group) throw new AppError(400, "分组不存在", "GROUP_NOT_FOUND");
    }

    // 动态构造要更新的数据，只放有值的字段
    const updateData: Record<string, unknown> = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined)
      updateData.description = payload.description;
    if (payload.price !== undefined) updateData.price = payload.price;
    if (payload.stock !== undefined) updateData.stock = payload.stock;
    if (payload.image !== undefined) updateData.image = payload.image;
    if (payload.groupId !== undefined) updateData.groupId = payload.groupId;
    if (payload.status !== undefined) updateData.status = payload.status;
    const product = await app.prisma.product.update({
      where: { id },
      data: updateData,
      include: { group: true },
    });

    await logOperation(app, {
      operatorId: req.user.id,
      action: "UPDATE_PRODUCT",
      targetType: "PRODUCT",
      targetId: product.id,
      detail: payload,
    });

    return ok(reply, product);
  });

  // 上下架快捷操作（管理员）
  app.patch("/:id/status", { preHandler: adminHook }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const { status } = parseBody(
      z.object({ status: z.enum(["ON", "OFF"]) }),
      req.body,
    );

    const exist = await app.prisma.product.findUnique({
      where: { id },
    });
    if (!exist) throw new NotFoundError("商品不存在");

    const product = await app.prisma.product.update({
      where: { id },
      data: { status },
    });

    await logOperation(app, {
      operatorId: req.user.id,
      action: status === "ON" ? "ONLINE_PRODUCT" : "OFFLINE_PRODUCT",
      targetType: "PRODUCT",
      targetId: product.id,
    });

    return ok(reply, product);
  });

  // 删除（管理员）
  app.delete("/:id", { preHandler: adminHook }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);

    const product = await app.prisma.product.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundError("商品不存在");

    // 检查是否有订单关联
    const orderCount = await app.prisma.order.count({
      where: { productId: id },
    });
    if (orderCount > 0) {
      throw new AppError(
        400,
        `商品有${orderCount}个订单关联，不能删除，建议下架`,
        "PRODUCT_HAS_ORDERS",
      );
    }

    await app.prisma.product.delete({
      where: { id },
    });

    await logOperation(app, {
      operatorId: req.user.id,
      action: "DELETE_PRODUCT",
      targetType: "PRODUCT",
      targetId: id,
      detail: { name: product.name },
    });

    return ok(reply, { sccess: true });
  });
}
