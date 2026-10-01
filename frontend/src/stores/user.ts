// Pinia store管用户状态：token、用户信息、登录/登出动作
// store不再调用request，改用api/auth.ts的函数，避免循环依赖
import { defineStore } from "pinia";
import * as authApi from "@/api/auth";
import type { LoginPayload, LoginResponse, UserInfo } from "@/types";

interface UserState {
  token: string;
  user: UserInfo | null;
}

function safeParseUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

// token和user从localStorage初始化，刷新页面不丢登录状态
export const useUserStore = defineStore("user", {
  // state 是一个无参函数，它返回一个类型为 UserState 的对象
  state: (): UserState => ({
    token: localStorage.getItem("token") ?? "",
    user: safeParseUser(),
  }),

  getters: {
    // 供路由守卫用
    isLogin: (state): boolean => !!state.token,
    isAdmin: (state): boolean => state.user?.role === "ADMIN",
    displayName: (state): string =>
      state.user?.nickname ?? state.user?.username ?? "未登录",
  },

  actions: {
    async login(payload: LoginPayload): Promise<void> {
      const res = await authApi.login(payload);

      this.token = res.token;
      this.user = res.user;
      // 双写
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
    },

    async fetchMe(): Promise<void> {
      const user = await authApi.fetchMe();
      this.user = user;

      localStorage.setItem("user", JSON.stringify(user));
    },

    logout(): void {
      this.token = "";
      this.user = null;
      // 双清
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});
