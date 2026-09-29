import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

// schema.yaml Banner
export interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image: string;
  mobile_image: string | null;
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
  /** Opsiyonel mobil görsel; `""` gönderilirse mevcut mobil görsel kaldırılır. */
  mobile_image?: File | "";
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
  // Sadece `image` dosya içeriyorsa FormData'ya geçmek yetmez: satıcı yalnızca
  // mobil afişi değiştirdiğinde veya kaldırdığında da istek çok parçalı
  // (multipart) gitmeli, aksi halde backend `mobile_image` alanını bir dosya
  // yükleme olarak değil düz JSON string olarak görüp hata döner.
  const needsFormData =
    payload.image instanceof File || payload.mobile_image instanceof File || payload.mobile_image === "";
  if (!needsFormData) {
    return apiClient.patch<Banner>(`/api/core/admin/banners/${bannerId}/`, payload);
  }
  return apiClient.patch<Banner>(`/api/core/admin/banners/${bannerId}/`, toBannerFormData(payload));
}

export function deleteBanner(bannerId: number): Promise<void> {
  return apiClient.delete<void>(`/api/core/admin/banners/${bannerId}/`);
}
