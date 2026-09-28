import bcrypt from "bcryptjs";
// impport type { FastifyRequest, FastifyReply } from "fastify";

export async function hashPassword(pwd: string): Promise<string> {
  return await bcrypt.hash(pwd, 10);
}

export async function verifyPassword(
  pwd: string,
  hashedPwd: string,
): Promise<boolean> {
  return bcrypt.compare(pwd, hashedPwd);
}

/**
 * 
 * @param request 
 * @param reply 
 * @returns 

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ message: "未登录或登录已过期" });
  }
}

export async function adminHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== "ADMIN") {
      return reply.code(403).send({ message: "无管理员权限" });
    }
  } catch {
    return reply.code(401).send({ message: "未登录或登录已过期" });
  }
}
 */
