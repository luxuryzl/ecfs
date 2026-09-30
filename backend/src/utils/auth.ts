import bcrypt from "bcryptjs";
import type { FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError, ForbiddenError } from "./errors.js";

export async function hashPassword(pwd: string): Promise<string> {
  return await bcrypt.hash(pwd, 10);
}

export async function verifyPassword(
  pwd: string,
  hashedPwd: string,
): Promise<boolean> {
  return bcrypt.compare(pwd, hashedPwd);
}

// 认证钩子，验证JWT
export async function authHook(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError("未登录或登录已过期");
  }
}

// 管理员钩子，验证JWT + role
export async function adminHook(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError("未登录或登录已过期");
  }

  /**
   * 以下代码如果放在try块内部，其错误会被吞掉
   * catch 不带参数，会捕获 try 块里任何异常。当 ForbiddenError 被抛出时，
   * 它会被这个 catch 拦住，然后被替换成 UnauthorizedError
   * 而if语句不可能因为 token 问题而抛异常，所以要放在外面。
   */
  if (request.user.role !== "ADMIN") {
    throw new ForbiddenError("需要管理员权限");
  }
}
