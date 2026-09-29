import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

// schema.yaml Banner
export interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image: string;
  button_text: string | null;
  link: string | null;
  is_active: boolean;
  order: number;
}

export function fetchBanners(page = 1, pageSize = 50): Promise<PaginatedResponse<Banner>> {
  return apiClient.get<PaginatedResponse<Banner>>(
    `/api/core/admin/banners/?page=${page}&page_size=${pageSize}`
  );
}

export interface BannerWritePayload {
  title?: string | null;
  subtitle?: string | null;
  /** Yeni afiş oluştururken zorunlu. */
  image?: File;
  button_text?: string | null;
  link?: string | null;
  is_active?: boolean;
  order?: number;
}

function toBannerFormData(payload: BannerWritePayload): FormData {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      formData.append(key, "");
      return;
    }
    formData.append(key, value instanceof File ? value : String(value));
  });
  return formData;
}

export function createBanner(payload: BannerWritePayload): Promise<Banner> {
  return apiClient.post<Banner>("/api/core/admin/banners/", toBannerFormData(payload));
}

export function updateBanner(bannerId: number, payload: BannerWritePayload): Promise<Banner> {
  if (!(payload.image instanceof File)) {
    return apiClient.patch<Banner>(`/api/core/admin/banners/${bannerId}/`, payload);
  }
  return apiClient.patch<Banner>(`/api/core/admin/banners/${bannerId}/`, toBannerFormData(payload));
}

export function deleteBanner(bannerId: number): Promise<void> {
  return apiClient.delete<void>(`/api/core/admin/banners/${bannerId}/`);
}
