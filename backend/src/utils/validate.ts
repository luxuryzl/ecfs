/**
 * Zod 是一个 TypeScript 优先的模式声明与验证库用于定义数据结构（Schema）
 * 这段代码是一个基于 ‌Zod‌ 库封装的通用数据校验函数，主要用于在后端（如 Node.js/Express）或前端处理未知来源的数据（如 HTTP 请求体）。
 * 它的作用是将“运行时校验”与“业务逻辑”解耦：如果数据合法，返回强类型的结果；如果非法，抛出一个自定义的结构化错误。
 * 把校验失败统一转成 ValidationError，并提取出可读的错误信息。
 */

import { z } from "zod";
import { ValidationError } from "./errors.js";
import type { ZodSchema } from "zod/v3";

// 添加1个id参数schema
export const idSchema = z.object({
  id: z.coerce.number().int().positive("ID 必须为正整数"),
});

// 第一个参数是 Zod 定义的校验规则（Schema）。z.ZodType<T> 表示这个 schema 校验通过后产生的数据类型是 T
// 第二个参数是待校验的数据。使用 unknown 类型是因为来自 HTTP 请求体、表单或外部 API 的数据在编译期是未知的，必须经过运行时校验才能信任
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body); //它返回一个结果对象，结构为 { success: true, data: T } 或 { success: false, error: ZodError }
  if (!result.success) {
    // .issues‌: 这是一个数组，包含了所有校验失败的详细信息。每个元素包含 path（出错字段的路径，如 ['user', 'email']）、message（错误消息）和 code（错误代码）
    const first = result.error.issues[0]; //这里只取第一个错误
    throw new ValidationError(
      // 如果存在第一个错误对象 first，则格式化消息；否则（理论上 success: false 时 issues 不应为空，但作为防御性编程），使用默认消息。
      first ? `${first.path.join(".")}: ${first.message}` : "请求参数错误",
    );
  }
  // 最终效果‌: 生成的错误消息类似 "user.email: Invalid email"，既指出了位置，又说明了原因，非常便于调试和前端展示。
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

// 添加一个辅助解析id的函数
export function parseId(params: unknown): number {
  return parseParams(idSchema, params).id;
}
