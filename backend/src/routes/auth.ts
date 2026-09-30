import type { FastifyInstance } from "fastify";

export default async function authRoutes(app: FastifyInstance) {
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

    const token = app.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role as "USER" | "ADMIN",
    });

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
    });
  });
}
