import type { FastifyInstance } from "fastify";
import z from "zod";
import { adminHook, authHook } from "../utils/auth.js";
import { ok } from "../utils/response.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { parseBody, parseId } from "../utils/validate.js";
import { logOperation } from "../utils/operationLog.js";

const createSchema = z.object({
  name: z
    .string()
    .min(1, "分组名称不能为空")
    .max(20, "分组名称不能超过20个字符"),
  sort: z.number().int().min(0).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

const updateSchema = createSchema.partial();
// 分组数量一般很少（几个到几十个），不需要分页、不需要搜索、不需要筛选，一次全返回
// 所以这儿不需要写listQuerySchema

// 路由
export async function groupRoutes(app: FastifyInstance) {
  // 列表，登录用户可见，前台选商品时要用
  app.get("/", { preHandler: authHook }, async (request, reply) => {
    const groups = await app.prisma.group.findMany({
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      include: {
        //include 是 Prisma ORM 用于‌关联查询,一次性获取与其相关联的其他表的数据或统计信息
        _count: {
          //这是 Prisma 提供的一个特殊虚拟字段，专门用于执行聚合计数操作，而无需手动编写 COUNT(*)
          select: { products: true }, //指定要计数的关联关系是 products
        },
      },
    });
    return ok(reply, groups);
  });

  // 详情
  app.get("/:id", { preHandler: authHook }, async (request, reply) => {
    // const id = Number((request.params as { id: string }).id);
    // const { id } = parseParams(idSchema, request.params);
    const id = parseId(request.params);
    const group = await app.prisma.group.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!group) throw new NotFoundError("分组不存在");
    return ok(reply, group);
  });

  // 新增(后台管理)
  app.post("/", { preHandler: adminHook }, async (request, reply) => {
    const payload = parseBody(createSchema, request.body);

    const exist = await app.prisma.group.findUnique({
      where: { name: payload.name },
    });
    if (exist) throw new AppError(400, "分组名称已存在", "GROUP_NAME_EXISTS");

    const group = await app.prisma.group.create({
      data: {
        name: payload.name,
        sort: payload.sort ?? 0,
        status: payload.status ?? "ACTIVE",
      },
    });

    await logOperation(app, {
      operatorId: request.user.id,
      action: "CREATE_GROUP",
      targetType: "GROUP",
      targetId: group.id,
      detail: { name: group.name },
    });

    return ok(reply, group);
  });

  // 更新(后台管理)
  app.put("/:id", { preHandler: adminHook }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const payload = parseBody(updateSchema, request.body);

    const exist = await app.prisma.group.findUnique({
      where: { id },
    });
    if (!exist) throw new NotFoundError("分组不存在");

    // 检查名称是否重复
    if (payload.name && payload.name !== exist.name) {
      const nameExist = await app.prisma.group.findUnique({
        where: { name: payload.name },
      });
      if (nameExist)
        throw new AppError(400, "分组名称已存在", "GROUP_NAME_EXISTS");
    }

    const group = await app.prisma.group.update({
      where: { id },
      data: {
        name: payload.name ?? exist.name,
        sort: payload.sort ?? exist.sort,
        status: payload.status ?? exist.status,
      },
    });

    await logOperation(app, {
      operatorId: request.user.id,
      action: "UPDATE_GROUP",
      targetType: "GROUP",
      targetId: group.id,
      detail: payload,
    });

    return ok(reply, group);
  });

  // 删除(后台管理)
  app.delete("/:id", { preHandler: adminHook }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    const group = await app.prisma.group.findUnique({
      where: { id },
    });
    if (!group) throw new NotFoundError("分组不存在");

    const productCount = await app.prisma.product.count({
      where: { groupId: id },
    });
    if (productCount > 0)
      throw new AppError(
        400,
        `分组下有${productCount}个商品，无法删除`,
        "GROUP_HAS_PRODUCTS",
      );

    await app.prisma.group.delete({
      where: { id },
    });

    await logOperation(app, {
      operatorId: request.user.id,
      action: "DELETE_GROUP",
      targetType: "GROUP",
      targetId: id,
      detail: { name: group.name },
    });

    return ok(reply, { success: true });
  });
}
