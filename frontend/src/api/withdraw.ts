import type {
  PageParams,
  Paginated,
  Withdraw,
  WithdrawChannel,
  WithdrawStatus,
} from "@/types";
import { request } from "./request";

export interface WithdrawQuery extends PageParams {
  status?: WithdrawStatus;
  userId?: number;
}

export interface WithdrawCreatePayload {
  amount: number;
  channel: WithdrawChannel;
  accountNo: string;
  accountName?: string;
  bankName?: string;
  account?: string;
  remark?: string;
}

export function createWithdraw(payload: WithdrawCreatePayload) {
  return request.post<Withdraw>("/withdraws", payload);
}

export function getMyWithdraws(params: WithdrawQuery = {}) {
  return request.get<Paginated<Withdraw>>("/withdraws/my", { params });
}

export function getAllWithdraws(params: WithdrawQuery = {}) {
  return request.get<Paginated<Withdraw>>("/withdraws", { params });
}

export function approveWithdraw(
  id: number,
  approved: boolean,
  remark?: string,
) {
  return request.patch<Withdraw>(`/withdraws/${id}/approve`, {
    approved,
    remark,
  });
}
