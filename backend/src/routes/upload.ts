import type { FastifyInstance } from "fastify";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { adminHook } from "../utils/auth.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/errors.js";
import { log } from "console";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// uploads目录：开发时__dirname=src/routes; 生产时__dirname=dist/routes，都退两级到backend/uploads
const UPLOAD_DIR = path.join(__dirname, "../../uploads");

// 允许的图片类型
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export async function uploadRoutes(app: FastifyInstance) {
  // 确保上传目录存在
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // 上传图片
  app.post("/", { preHandler: adminHook }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      throw new AppError(400, "请选择要上传的图片", "NO_FILE");
    }

    // 校验类型
    if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
      throw new AppError(
        400,
        "只支持 JPG/PNG/GIF/WEBP图片格式",
        "INVALID_FILE_TYPE",
      );
    }

    // 生成随机文件名
    const ext = EXT_MAP[data.mimetype] ?? ".jpg";
    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // 写入磁盘
    const buffer = await data.toBuffer();
    await fs.writeFile(filepath, buffer);

    // 返回可访问的URL
    const url = `/uploads/${filename}`;

    return ok(reply, {
      filename,
      url,
      size: buffer.length,
      mimetype: data.mimetype,
    });
  });

  // 删除图片，可选，暂不实现
}
