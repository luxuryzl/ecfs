import type { Notice, NoticeStatus, PageParams, Paginated } from "@/types";
import { request } from "./request";

export interface NoticeQuery extends PageParams {
  status?: NoticeStatus;
}

export interface NoticeListItem {
  id: number;
  title: string;
  status: NoticeStatus;
  createdAt?: string;
}

export interface NoticePayload {
  title: string;
  content: string;
  status?: NoticeStatus;
}

// 公开接口
export function getPublicNotices(params: NoticeQuery = {}) {
  return request.get<Paginated<NoticeListItem>>("/notices/public", { params });
}

export function getPublicNoticeDetail(id: number) {
  return request.get<Notice>(`/notices/public/${id}`);
}

// 管理接口
export function getAllNotices(params: NoticeQuery = {}) {
  return request.get<Paginated<Notice>>("/notices", { params });
}

export function getNoticeDetail(id: number) {
  return request.get<Notice>(`/notices/${id}`);
}

export function createNotice(payload: NoticePayload) {
  return request.post<Notice>("/notices", payload);
}

export function updateNotice(id: number, payload: Partial<NoticePayload>) {
  return request.patch<Notice>(`/notices/${id}`, payload);
}

export function updateNoticeStatus(id: number, status: NoticeStatus) {
  return request.patch<Notice>(`/notices/${id}/status`, { status });
}

export function deleteNotice(id: number) {
  return request.delete<{ success: boolean }>(`/notices/${id}`);
}
