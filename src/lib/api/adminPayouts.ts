import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";
import type { PayoutProcessPayload, PayoutStatus, ProcessorPayoutRequest } from "@/lib/api/payoutTypes";

export type PayoutRecipientType = "market" | "manager";

export interface FetchAdminPayoutsParams {
  recipientType?: PayoutRecipientType;
  status?: PayoutStatus;
  page?: number;
  pageSize?: number;
}

// Platformun (Admin) ödeyeceği talepler — Market + Kurye Yöneticisi. Kurye talepleri
// burada görünmez (onları kurye yöneticisi öder, bkz. api/couriers/manager/payouts/).
export function fetchAdminPayouts(
  params: FetchAdminPayoutsParams = {}
): Promise<PaginatedResponse<ProcessorPayoutRequest>> {
  const query = new URLSearchParams();
  if (params.recipientType) query.set("recipient_type", params.recipientType);
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 20));
  return apiClient.get<PaginatedResponse<ProcessorPayoutRequest>>(
    `/api/admin/payouts/?${query.toString()}`
  );
}

export function approveAdminPayout(
  payoutId: number,
  payload: PayoutProcessPayload = {}
): Promise<ProcessorPayoutRequest> {
  return apiClient.post<ProcessorPayoutRequest>(`/api/admin/payouts/${payoutId}/approve/`, payload);
}

export function rejectAdminPayout(
  payoutId: number,
  payload: PayoutProcessPayload = {}
): Promise<ProcessorPayoutRequest> {
  return apiClient.post<ProcessorPayoutRequest>(`/api/admin/payouts/${payoutId}/reject/`, payload);
}
