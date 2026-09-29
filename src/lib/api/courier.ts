import { apiClient } from "@/lib/apiClient";
import type { OrderDetail } from "@/lib/api/orders";
import type { PaginatedResponse } from "@/lib/pagination";
import type {
  BankInfo,
  PayoutCreatedResponse,
  PayoutHistoryResponse,
} from "@/lib/api/payoutTypes";

export interface CourierHistoryParams {
  date?: "today" | "weekly" | "monthly";
  payment?: "cash" | "card";
  page?: number;
  pageSize?: number;
}

// FRONTEND_CHANGES.md §9.3 — backend zaten KVKK maskeli döner (ad/telefon
// maskeli, adresten sadece mahalle/ilçe, kurye notu gizli); ek işlem gerekmez.
export function fetchCourierHistory(
  params: CourierHistoryParams = {}
): Promise<PaginatedResponse<OrderDetail>> {
  const query = new URLSearchParams();
  if (params.date) query.set("date", params.date);
  if (params.payment) query.set("payment", params.payment);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 20));
  return apiClient.get<PaginatedResponse<OrderDetail>>(
    `/api/couriers/my-history/?${query.toString()}`
  );
}

export interface CourierAvailability {
  is_available: boolean;
}

export function fetchCourierAvailability(): Promise<CourierAvailability> {
  return apiClient.get<CourierAvailability>("/api/couriers/me/availability/");
}

export function updateCourierAvailability(isAvailable: boolean): Promise<CourierAvailability> {
  return apiClient.patch<CourierAvailability>("/api/couriers/me/availability/", {
    is_available: isAvailable,
  });
}

// Kuryeye atanmış ve HANDED_TO_COURIER veya ON_THE_WAY olan siparişler — maskesiz (aktif teslimat).
export function fetchCourierMyOrders(page = 1, pageSize = 20): Promise<PaginatedResponse<OrderDetail>> {
  return apiClient.get<PaginatedResponse<OrderDetail>>(
    `/api/couriers/my-orders/?page=${page}&page_size=${pageSize}`
  );
}

export type CourierOrderNextStatus = "ON_THE_WAY" | "DELIVERED";

// Geçişler: HANDED_TO_COURIER -> ON_THE_WAY -> DELIVERED.
export function updateCourierOrderStatus(
  orderId: number,
  status: CourierOrderNextStatus
): Promise<{ status: string }> {
  return apiClient.patch<{ status: string }>(`/api/couriers/my-orders/${orderId}/status/`, { status });
}

export interface CourierStats {
  first_name: string;
  last_name: string;
  vehicle_type: string;
  plate_number: string;
  total_deliveries: number;
  total_earnings: string;
  is_available: boolean;
  is_active: boolean;
}

export type CourierStatsFilter = "daily" | "weekly" | "monthly" | "yearly";

// Kazanç, sipariş anında mühürlenen paket başı kurye ücretlerinin toplamıdır
// (sabit `70₺ × teslimat` istemci tarafında yeniden hesaplanmaz).
export function fetchCourierStats(filter?: CourierStatsFilter): Promise<CourierStats> {
  return apiClient.get<CourierStats>(`/api/couriers/my-stats/${filter ? `?filter=${filter}` : ""}`);
}

export function fetchCourierBankInfo(): Promise<BankInfo> {
  return apiClient.get<BankInfo>("/api/couriers/me/bank-info/");
}

export function updateCourierBankInfo(payload: Partial<BankInfo>): Promise<BankInfo> {
  return apiClient.patch<BankInfo>("/api/couriers/me/bank-info/", payload);
}

export function fetchCourierPayoutHistory(page = 1): Promise<PayoutHistoryResponse> {
  return apiClient.get<PayoutHistoryResponse>(
    `/api/couriers/payout/history/?page=${page}&page_size=20`
  );
}

export function requestCourierPayout(
  amount: string,
  notes?: string
): Promise<PayoutCreatedResponse> {
  return apiClient.post<PayoutCreatedResponse>("/api/couriers/payout/request/", {
    amount,
    ...(notes ? { notes } : {}),
  });
}
