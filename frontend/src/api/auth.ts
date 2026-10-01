// 认证相关的API
import { request } from "./request";
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  UserInfo,
} from "@/types";

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return request.post<LoginResponse>("/auth/login", payload);
}

export function register(payload: RegisterPayload) {
  return request.post<{
    id: number;
    username: string;
    nickname?: string | null;
  }>("/auth/register", payload);
}

export function fetchMe() {
  return request.get<UserInfo>("/auth/me");
}
