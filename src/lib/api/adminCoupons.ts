import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

// schema.yaml Coupon
export interface AdminCoupon {
  id: number;
  user: string;
  active: boolean;
  code: string;
  discount_percent: number | null;
  discount_amount: string | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  usage_count: number;
}

export function fetchAdminCoupons(page = 1, pageSize = 20): Promise<PaginatedResponse<AdminCoupon>> {
  return apiClient.get<PaginatedResponse<AdminCoupon>>(
    `/api/coupons/admin?page=${page}&page_size=${pageSize}`
  );
}

// schema.yaml CouponCreateUpdate — `discount_percent` veya `discount_amount`'tan
// sadece biri gönderilir; `user` boş bırakılırsa genel (herkese açık) kupon olur.
export interface AdminCouponWritePayload {
  code: string;
  discount_percent?: number | null;
  discount_amount?: string | null;
  start_date: string;
  end_date: string;
  active?: boolean;
  usage_limit?: number | null;
  user?: number | null;
}

// schema.yaml CouponCreateUpdate — create/update yanıtı, listeleme yanıtından
// (Coupon) farklı olarak `user`'ı ham ID (number|null) döner, "S*** V***" gibi
// okunabilir bir isim değil.
export interface AdminCouponWriteResponse extends Omit<AdminCoupon, "user"> {
  user: number | null;
}

export function createAdminCoupon(
  payload: AdminCouponWritePayload
): Promise<AdminCouponWriteResponse> {
  return apiClient.post<AdminCouponWriteResponse>("/api/coupons/admin", payload);
}

export function updateAdminCoupon(
  couponId: number,
  payload: Partial<AdminCouponWritePayload>
): Promise<AdminCouponWriteResponse> {
  return apiClient.patch<AdminCouponWriteResponse>(`/api/coupons/admin/${couponId}`, payload);
}

export function deleteAdminCoupon(couponId: number): Promise<void> {
  return apiClient.delete<void>(`/api/coupons/admin/${couponId}`);
}
