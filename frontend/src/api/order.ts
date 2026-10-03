import { request } from "./request";
import type {
  Order,
  OrderCreatePayload,
  OrderStatus,
  OrderType,
  Paginated,
  PageParams,
} from "@/types";

export interface OrderQuery extends PageParams {
  status?: OrderStatus;
  type?: OrderType;
  userId?: number;
}

export function createOrder(payload: OrderCreatePayload) {
  return request.post<Order>("/orders", payload);
}

export function getMyOrders(params: OrderQuery = {}) {
  return request.get<Paginated<Order>>("/orders/my", { params });
}

export function getAllOrders(params: OrderQuery = {}) {
  return request.get<Paginated<Order>>("/orders", { params });
}

export function getOrderDetail(id: number) {
  return request.get<Order>(`/orders/${id}`);
}

export function updateOrderStatus(
  id: number,
  status: OrderStatus,
  remark?: string,
) {
  return request.patch<Order>(`/orders/${id}/status`, { status, remark });
}

export function createSupplement(id: number, amount: number, remark?: string) {
  return request.post<Order>(`/orders/${id}/supplement`, { amount, remark });
}

export function cancelOrder(id: number) {
  return request.post<Order>(`/orders/${id}/cancel`);
}
