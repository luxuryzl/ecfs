import type { FastifyInstance } from "fastify";
import z from "zod";
import { parseBody, parseQuery } from "../utils/validate.js";
import { ok } from "../utils/response.js";
import { NotFoundError } from "../utils/errors.js";
import { adminHook } from "../utils/auth.js";
import { logOperation } from "../utils/operationLog.js";

// schema
const createSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题不能超过100个字符"),
  content: z
    .string()
    .min(1, "内容不能为空")
    .max(1000, "内容不能超过1000个字符"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  keyword: z.string().optional(),
});

// 路由
export async function noticeRoutes(app: FastifyInstance) {
  // 公开：已发布公告列表，无需登录
  app.get("/public", async (request, reply) => {
    const query = parseBody(listQuerySchema, request.query);
    const { page, pageSize, keyword } = query;

    const where: Record<string, unknown> = { status: "PUBLISHED" };
    if (keyword) where.title = { contains: keyword };

    const [list, total] = await Promise.all([
      app.prisma.notice.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      }),
      app.prisma.notice.count({ where }),
    ]);

    return ok(reply, { list, total });
  });

  // 公告详情
  app.get("/public/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    const notice = await app.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.status !== "PUBLISHED") {
      throw new NotFoundError("公告不存在");
    }

    return ok(reply, notice);
  });

  // 管理员：全部公告列表
  app.get("/", { preHandler: adminHook }, async (request, reply) => {
    const query = parseQuery(listQuerySchema, request.query);
    const { page, pageSize, status, keyword } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (keyword) where.title = { contains: keyword };

    const [list, total] = await Promise.all([
      app.prisma.notice.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
      }),
      app.prisma.notice.count({ where }),
    ]);

    return ok(reply, { list, total });
  });

  // 管理员公告详情
  app.get("/:id", { preHandler: adminHook }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    const notice = await app.prisma.notice.findUnique({ where: { id } });
    if (!notice) throw new NotFoundError("公告不存在");

    return ok(reply, notice);
  });

  // 管理员：新建公告
  app.post("/", { preHandler: adminHook }, async (request, reply) => {
    const payload = parseBody(createSchema, request.body);

    const notice = await app.prisma.notice.create({
      data: {
        title: payload.title,
        content: payload.content,
        status: payload.status ?? "PUBLISHED",
      },
    });

    await logOperation(app, {
      operatorId: request.user.id,
      action: "CREATE_NOTICE",
      targetType: "NOTICE",
      targetId: notice.id,
      detail: { title: notice.title, status: notice.status },
    });

    return ok(reply, notice, 201);
  });

  //  编辑
  app.patch("/:id", { preHandler: adminHook }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const payload = parseBody(updateSchema, request.body);

    const exist = await app.prisma.notice.findUnique({
      where: { id },
    });
    if (!exist) throw new NotFoundError("公告不存在");

    // 动态构造updateData， 按项目规范
    const updateData: Record<string, unknown> = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.content !== undefined) updateData.content = payload.content;
    if (payload.status !== undefined) updateData.status = payload.status;

    const notice = await app.prisma.notice.update({
      where: { id },
      data: updateData,
    });

    await logOperation(app, {
      operatorId: request.user.id,
      action: "UPDATE_NOTICE",
      targetType: "Notice",
      targetId: id,
      detail: { title: notice.title },
    });

    return ok(reply, notice);
  });

  // 管理员改状态
  app.patch(
    "/:id/status",
    { preHandler: adminHook },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const payload = parseBody(
        z.object({
          status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
        }),
        request.body,
      );

      const exist = await app.prisma.notice.findUnique({
        where: { id },
      });
      if (!exist) throw new NotFoundError("公告不存在");

      const notice = await app.prisma.notice.update({
        where: { id },
        data: { status: payload.status },
      });

      await logOperation(app, {
        operatorId: request.user.id,
        action: "UPDATE_NOTICE_STATUS",
        targetType: "NOTICE",
        targetId: id,
        detail: { from: exist.status, to: payload.status, title: notice.title },
      });

      return ok(reply, notice);
    },
  );

  // 管理员：删除
  app.delete("/:id", { preHandler: adminHook }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);

    const exist = await app.prisma.notice.findUnique({
      where: { id },
    });
    if (!exist) throw new NotFoundError("公告不存在");

    await app.prisma.notice.delete({ where: { id } });

    await logOperation(app, {
      operatorId: req.user.id,
      action: "DELETE_NOTICE",
      targetType: "NOTICE",
      targetId: id,
      detail: { title: exist.title },
    });

    return ok(reply, { success: true });
  });
}
