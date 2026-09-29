import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

export type StaffRole = "MARKET_OWNER" | "COURIER_MANAGER";

// schema.yaml StaffMember — Market Sahibi, Kurye Yöneticisi ve Admin hesapları.
export interface StaffMember {
  id: number;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  role_display: string;
  status: "active" | "inactive";
  is_active: boolean;
  date_joined: string;
}

export interface FetchStaffParams {
  role?: StaffRole;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function fetchStaff(params: FetchStaffParams = {}): Promise<PaginatedResponse<StaffMember>> {
  const query = new URLSearchParams();
  if (params.role) query.set("role", params.role);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 20));
  return apiClient.get<PaginatedResponse<StaffMember>>(`/api/admin/users/?${query.toString()}`);
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  /** Market sahibi için zorunlu. */
  phone_number?: string;
  username?: string;
  /** Sadece Market Sahibi. */
  store_name?: string;
}

export function createStaff(payload: CreateStaffPayload): Promise<StaffMember> {
  return apiClient.post<StaffMember>("/api/admin/users/", payload);
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  phone_number?: string | null;
  role?: StaffRole;
  is_active?: boolean;
}

export function updateStaff(staffId: number, payload: UpdateStaffPayload): Promise<StaffMember> {
  return apiClient.patch<StaffMember>(`/api/admin/users/${staffId}/`, payload);
}

export function resetStaffPassword(
  staffId: number,
  temporaryPassword: string
): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>(`/api/admin/users/${staffId}/reset-password/`, {
    temporary_password: temporaryPassword,
  });
}
