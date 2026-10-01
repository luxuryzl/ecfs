// 对后端的类型定义

export type Role = "USER" | "ADMIN";

// 后端统一响应结构
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

export interface UserInfo {
  id: number;
  username: string;
  nickname?: string | null;
  phone?: string | null;
  role: Role;
  balance: number;
  status?: string;
  createAt?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface RegisterPayload {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
}

// 分布响应
export interface Paginated<T> {
  list: T[];
  total: number;
}
