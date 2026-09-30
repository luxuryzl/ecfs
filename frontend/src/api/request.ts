import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { ElMessage } from "element-plus";
import { ms } from "element-plus/es/locales.mjs";

const request: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

// 请求挂载器:自动带token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (res: AxiosResponse) => res.data, //直接返回res.data，调用方少写一层
  (err) => {
    const msg = err.response?.data?.message ?? err.message ?? "请求失败";
    ElMessage.error(msg);
    if (err.response?.status === 401) {
      localStorage.removeItem("token");

      if (location.pathname !== "/login") {
        location.href = "/login";
      }
    }

    return Promise.reject(err);
  },
);

export default request;
