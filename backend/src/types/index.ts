import type {
  User,
  Product,
  Group,
  Order,
  Recharge,
  Withdraw,
  Notice,
} from "../generated/prisma/client.js";

export type Role = "USER" | "ADMIN";

// 签发token时的payload类型
export interface JwtPayload {
  id: number;
  username: string;
  role: Role;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    prisma: import("../generated/prisma/client.js").PrismaClient;
  }
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
}

export type { User, Product, Group, Order, Recharge, Withdraw, Notice };
