// api内的文件，只负责HTTP请求，一个模块一个文件
// axios实例+拦截器+解包。
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type AxiosRequestConfig,
} from "axios";
import { ElMessage } from "element-plus";
import type { ApiResponse } from "@/types";

// 创建axios实例
const instance: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

// 请求拦截器:自动带token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器：只处理错误，不改数据结构
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const msg = err.response?.data?.message ?? err.message ?? "请求失败";
    ElMessage.error(msg);

    // 401未登录：清token，跳登录页
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      /**
       * 动态导入，避免循环依赖
       * 为什么用动态 import：request.ts 会被 router 和 stores 引用，
       * 如果静态 import router 会造成循环依赖，
       * Node/Vite 会报 Cannot access 'router' before initialization。
       * 动态 import 在运行时才加载，避开循环。
       */
      const { default: router } = await import("@/router");
      if (router.currentRoute.value.path !== "/login") {
        router.push({
          path: "/login",
          query: { redirect: router.currentRoute.value.fullPath },
        });
      }
    }

    return Promise.reject(err);
  },
);

/**
 * 解包辅助函数
 * 后端统一响应 { success: true, data: T } 中取出 data
 *这是整个前端唯一处理 { success, data } 结构的地方
 */
async function unwrap<T>(
  promise: Promise<AxiosResponse<ApiResponse<T>>>,
): Promise<T> {
  const res = await promise;
  const body = res.data;

  // 响应结构校验
  if (!body || typeof body !== "object" || !("success" in body)) {
    throw new Error("响应格式异常");
  }

  if (body.success === false) {
    const msg = (body as { message?: string }).message ?? "请求失败";
    throw new Error(msg);
  }

  return body.data;
}

// 对外暴露的请求方法，泛型T就是业务数据的类型，调用处拿到的就是T
export const request = {
  get<T>(url: string, conifg?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(instance.get(url, conifg));
  },

  delete<T>(url: string, conifg?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(instance.delete(url, conifg));
  },

  post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return unwrap<T>(instance.post(url, data, config));
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(instance.put(url, data, config));
  },

  patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return unwrap<T>(instance.patch(url, data, config));
  },
};

export default instance;
