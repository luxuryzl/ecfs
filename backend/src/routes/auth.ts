import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword, authHook } from "../utils/auth.js";
import { parseBody } from "../utils/validate.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/errors.js";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少 3 个字符")
    .max(20, "用户名最多 20 个字符")
    .regex(
      /^[a-zA-Z][a-zA-Z0-9]*(?:_[a-zA-Z0-9]+)*$/,
      "用户名只能字母开头,包含字母、数字和下划线，且下划线不能连续",
    ),
  password: z
    .string()
    .min(6, "密码至少 6 位")
    .max(64, "密码最多 64 位")
    .regex(/[a-zA-Z]/, "密码必须包含字母")
    .regex(/\d/, "密码必须包含数字"),
  nickname: z.string().max(20).optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "手机号格式不正确")
    .optional(),
});

const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export async function authRoutes(app: FastifyInstance) {
  // 注册
  app.post("/register", async (req, reply) => {
    const data = parseBody(registerSchema, req.body);

    const exist = await app.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (exist) throw new AppError(400, "用户名已存在", "USERNAME_EXISTS");

    const user = await app.prisma.user.create({
      data: {
        username: data.username,
        password: await hashPassword(data.password),
        nickname: data.nickname ?? data.username,
        phone: data.phone ?? null,
        role: "USER",
        balance: 0,
      },
    });

    return ok(
      reply,
      { id: user.id, username: user.username, nickname: user.nickname },
      201,
    );
  });

  // 登录
  app.post("/login", async (req, reply) => {
    const data = parseBody(loginSchema, req.body);

    const user = await app.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (!user)
      throw new AppError(400, "用户名或密码错误", "INVALID_CREDENTIALS");
    if (user.status === "DISABLED")
      throw new AppError(403, "账号已被禁用", "ACCOUNT_DISABLED");

    const valid = await verifyPassword(data.password, user.password);
    if (!valid)
      throw new AppError(400, "用户名或密码错误", "INVALID_CREDENTIALS");

    const token = app.jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role as "USER" | "ADMIN",
      },
      { expiresIn: "7d" },
    );

    return ok(reply, {
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        balance: user.balance,
      },
    });
  });

  // 获取当前登录用户信息
  app.get("/me", { preHandler: authHook }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) throw new AppError(401, "用户不存在", "USER_NOT_FOUND");

    return ok(reply, {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      phone: user.phone,
      role: user.role,
      balance: user.balance,
      status: user.status,
      createAt: user.createdAt,
    });
  });
}
