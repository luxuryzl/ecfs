/**
 * 为什么要多此一举搞个 env.ts ?
 * 直接 process.env.JWT_SECRET 也能用，但有几个问题：
 * 1.类型是 string | undefined：TS 里到处要判空，很烦
 * 2.拼写错误无法发现：process.env.JWT_SECERT 写错了不会报错，运行时才变 undefined。用 env.JWT_SECRET 有智能提示和编译检查
 * 3.缺失关键配置时启动即失败：required() 会在启动时就抛错，而不是等某个请求跑到一半才发现数据库连不上。
 * 4.类型转换集中处理：PORT 从 .env 读出来是字符串 "3000"，env.ts 里转成 number，业务代码不用每次都 Number()
 * 一句话：.env 是配置源，env.ts 是配置的“类型化访问层”，两者配合使用
 */
import "dotenv/config"; // 这一步把 .env 文件读进 process.env

// 定义一个辅助函数，用于检测.env中的值是否存在
function required(key: string): string {
  const value = process.env[key]; //// key 是参数，值由调用方传入，动态属性访问
  if (!value) {
    throw new Error(
      `缺少必需的环境变量，Missing required environment variable: ${key}`,
    );
  }
  return value;
}

// 通过辅助函数定义env对象
export const env = {
  DATABASE_URL: required("DATABASE_URL"), // 从 process.env 里取，缺失就抛错
  JWT_SECRET: required("JWT_SECRET"),
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || "development",
};
