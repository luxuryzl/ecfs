import { z } from "zod";
import { ValidationError } from "./errors.js";

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ValidationError(
      first ? `${first.path.join(".")}: ${first.message}` : "请求参数错误",
    );
  }
  return result.data;
}

export function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ValidationError(
      first ? `${first.path.join(".")}: ${first.message}` : "查询参数错误",
    );
  }
  return result.data;
}

export function parseParams<T>(schema: z.ZodType<T>, params: unknown): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ValidationError(
      first ? `${first.path.join(".")}: ${first.message}` : "路径参数错误",
    );
  }
  return result.data;
}
