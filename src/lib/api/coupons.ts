import { apiClient } from "@/lib/apiClient";

// FRONTEND_CHANGES.md §9.2: tutarlar artık string.
export interface CouponValidateResponse {
  is_valid: boolean;
  code: string;
  cart_total: string;
  discount_value: string;
  new_total: string;
  message: string;
}

export function validateCoupon(code: string): Promise<CouponValidateResponse> {
  return apiClient.post<CouponValidateResponse>("/api/coupons/validate/", { code });
}
