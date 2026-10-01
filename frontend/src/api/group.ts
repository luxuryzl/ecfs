import type { Group, GroupPayload } from "@/types";
import { request } from "./request";

export function getGroups() {
  return request.get<Group[]>("groups");
}

export function getGroupDetail(id: number) {
  return request.get<Group>(`groups/${id}`);
}

export function createGroup(payload: GroupPayload) {
  return request.post<Group>("/groups", payload);
}

export function updateGroup(id: number, payload: Partial<GroupPayload>) {
  return request.put<Group>(`/groups/${id}`, payload);
}

export function deleteGroup(id: number) {
  return request.delete<{ success: boolean }>(`/groups/${id}`);
}
