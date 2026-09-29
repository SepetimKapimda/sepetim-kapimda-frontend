import { apiClient } from "@/lib/apiClient";

// schema.yaml UserMeUpdate / UserDetail — GET/PATCH /api/users/me/ (tüm roller ortak).
export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string | null;
}

export interface UserDetail {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  role: string | null;
  is_staff: boolean;
}

export function updateMyProfile(payload: UpdateProfilePayload): Promise<UserDetail> {
  return apiClient.patch<UserDetail>("/api/users/me/", payload);
}

// schema.yaml ChangePassword — hatalar standart zarf değil, alan bazlı düz obje döner
// (apiClient.extractErrorMessage bunu da destekler).
export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export function changeMyPassword(payload: ChangePasswordPayload): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>("/api/users/change-password/", payload);
}
