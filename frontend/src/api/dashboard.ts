import type { OrderStatus } from "@/types";
import { request } from "./request";

// 统计图表接口
export interface DashboardStats {
  userCount: number;
  productCount: number;
  orderCount: number;
  orderAmount: number;
  pendingRecharges: number;
  pendingWithdraws: number;
  trend: Array<{ date: string; count: number; amount: number }>;
  statusDistribution: Array<{ status: OrderStatus; count: number }>;
}

export function getDashboardStats() {
  return request.get<DashboardStats>("/dashboard/stats");
}
