import type { PageParams, Paginated, Recharge, RechargeStatus } from "@/types";
import { request } from "./request";

export interface RechargeQuery extends PageParams {
  status?: RechargeStatus;
  userId?: number;
}

export function createRecharge(amount: number, remark?: string) {
  return request.post<Recharge>("/recharges", { amount, remark });
}

export function getMyRecharges(params: RechargeQuery = {}) {
  return request.get<Paginated<Recharge>>("/recharges/my", { params });
}

export function getAllRecharges(params: RechargeQuery = {}) {
  return request.get<Paginated<Recharge>>("/recharges", { params });
}

export function approveRecharge(
  id: number,
  approved: boolean,
  remark?: string,
) {
  return request.patch<Recharge>(`/recharges/${id}/approve`, {
    approved,
    remark,
  });
}
