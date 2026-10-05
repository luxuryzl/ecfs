import type {
  PageParams,
  Paginated,
  Role,
  UserInfo,
  UserStatus,
} from "@/types";
import { request } from "./request";

export interface UserQuery extends PageParams {
  role?: Role;
  status?: UserStatus;
}

export interface UserListItem extends UserInfo {
  _count?: {
    orders: number;
    recharges: number;
    withdraws: number;
  };
}

export interface UserDetail extends UserListItem {
  updatedAt?: string;
  orderAmount?: number;
}

export function getUsers(params: UserQuery = {}) {
  return request.get<Paginated<UserListItem>>("/users", { params });
}

export function getUserDetail(id: number) {
  return request.get<UserDetail>(`/users/${id}`);
}

export function updateUserStatus(id: number, status: UserStatus) {
  return request.patch<UserInfo>(`/users/${id}/status`, { status });
}

export function adjustBalance(id: number, amount: number, remark: string) {
  return request.post<UserInfo>(`/users/${id}/balance`, { amount, remark });
}

export function resetPassword(id: number, newPassword: string) {
  return request.post<{ success: boolean }>(`/users/${id}/reset-password`, {
    newPassword,
  });
}
