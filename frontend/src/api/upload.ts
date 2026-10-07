import { request } from "./request";

export interface UploadResult {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

/**
 * 上传图片
 * 注意：这里用FormData，不能用普通的JSON数据
 */

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await request.post<UploadResult>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res;
}
