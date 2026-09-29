import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";
import type { OrderDetail } from "@/lib/api/orders";
import type {
  BankInfo,
  PayoutCreatedResponse,
  PayoutHistoryResponse,
  PayoutProcessPayload,
  ProcessorPayoutRequest,
} from "@/lib/api/payoutTypes";

// schema.yaml VehicleTypeEnum
export type VehicleType = "motorcycle" | "car" | "bicycle";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  motorcycle: "Motosiklet",
  car: "Otomobil",
  bicycle: "Bisiklet",
};

// schema.yaml CourierDetail
// Not: OpenAPI şeması `vehicle_type`'ı VehicleTypeEnum (motorcycle|car|bicycle) olarak
// tanımlıyor, ama canlı backend GET yanıtlarında Türkçe görünen adı döndürüyor
// (Örn. "Motosiklet") — bu yüzden okuma tarafında `string` olarak tiplendirildi.
// Yazma (create/update) tarafı hâlâ kod kabul ediyor, `VehicleType` orada geçerli.
export interface ManagerCourier {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  vehicle_type: string;
  plate_number: string;
  is_active: boolean;
  is_available: boolean;
  total_deliveries: number;
}

export interface CreateCourierPayload {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  vehicle_type: VehicleType;
  plate_number: string;
}

export interface UpdateCourierPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  vehicle_type?: VehicleType;
  plate_number?: string;
  is_active?: boolean;
}

export async function fetchManagerCouriers(isActive = true): Promise<ManagerCourier[]> {
  const data = await apiClient.get<PaginatedResponse<ManagerCourier>>(
    `/api/couriers/manager/couriers/?is_active=${isActive}&page_size=100`
  );
  return data.results;
}

export function createManagerCourier(payload: CreateCourierPayload): Promise<ManagerCourier> {
  return apiClient.post<ManagerCourier>("/api/couriers/manager/couriers/", payload);
}

export function updateManagerCourier(
  courierId: number,
  payload: UpdateCourierPayload
): Promise<ManagerCourier> {
  return apiClient.patch<ManagerCourier>(`/api/couriers/manager/couriers/${courierId}/`, payload);
}

// Soft delete: hesap pasife alınır (giriş yetkisi de gider), geçmişi korunur.
export function deleteManagerCourier(courierId: number): Promise<void> {
  return apiClient.delete<void>(`/api/couriers/manager/couriers/${courierId}/`);
}

// schema.yaml: RECEIVED/PREPARING/WAITING_COURIER durumunda ve kuryesi olmayan
// siparişler — sayfasız düz dizi.
export function fetchUnassignedOrders(): Promise<OrderDetail[]> {
  return apiClient.get<OrderDetail[]>("/api/couriers/manager/unassigned-orders/");
}

export function assignOrderToCourier(
  orderId: number,
  courierId: number
): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>(
    `/api/couriers/manager/assign-order/${orderId}/`,
    { courier_id: courierId }
  );
}

export interface ManagerOrdersParams {
  status?: "waiting" | "on_the_way" | "delivered" | "canceled";
  date?: "today" | "weekly" | "monthly";
  page?: number;
  pageSize?: number;
}

// Yöneticinin kendi kuryelerine atanmış + henüz atanmamış bekleyen siparişler — sayfalı.
export function fetchManagerOrders(
  params: ManagerOrdersParams = {}
): Promise<PaginatedResponse<OrderDetail>> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.date) query.set("date", params.date);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 20));
  return apiClient.get<PaginatedResponse<OrderDetail>>(
    `/api/couriers/manager/orders/?${query.toString()}`
  );
}

export interface ManagerDashboard {
  total_manager_earnings: string;
  active_couriers_count: number;
  total_deliveries_by_team: number;
  unassigned_orders_count: number;
}

export function fetchManagerDashboard(): Promise<ManagerDashboard> {
  return apiClient.get<ManagerDashboard>("/api/couriers/manager/dashboard/");
}

export interface ManagerStatsPoint {
  label: string;
  start: string;
  packages: number;
  revenue: number;
  expense: number;
  net: number;
}

export interface ManagerStats {
  filter: string;
  start_date: string;
  end_date: string;
  points: ManagerStatsPoint[];
  total_packages: number;
  total_revenue: string;
  total_expense: string;
  net_profit: string;
}

export interface ManagerStatsParams {
  filter?: "daily" | "weekly" | "monthly" | "yearly";
  startDate?: string;
  endDate?: string;
}

export function fetchManagerStats(params: ManagerStatsParams = {}): Promise<ManagerStats> {
  const query = new URLSearchParams();
  if (params.startDate && params.endDate) {
    query.set("start_date", params.startDate);
    query.set("end_date", params.endDate);
  } else if (params.filter) {
    query.set("filter", params.filter);
  }
  const qs = query.toString();
  return apiClient.get<ManagerStats>(`/api/couriers/manager/stats/${qs ? `?${qs}` : ""}`);
}

// --- Yöneticinin platformdan (admin) kendi hakedişi ---

export function fetchManagerBankInfo(): Promise<BankInfo> {
  return apiClient.get<BankInfo>("/api/couriers/manager/me/bank-info/");
}

export function updateManagerBankInfo(payload: Partial<BankInfo>): Promise<BankInfo> {
  return apiClient.patch<BankInfo>("/api/couriers/manager/me/bank-info/", payload);
}

export function fetchManagerPayoutHistory(page = 1): Promise<PayoutHistoryResponse> {
  return apiClient.get<PayoutHistoryResponse>(
    `/api/couriers/manager/payout/history/?page=${page}&page_size=20`
  );
}

export function requestManagerPayout(
  amount: string,
  notes?: string
): Promise<PayoutCreatedResponse> {
  return apiClient.post<PayoutCreatedResponse>("/api/couriers/manager/payout/request/", {
    amount,
    ...(notes ? { notes } : {}),
  });
}

// --- Yöneticinin, kendi kuryelerinin hakediş taleplerini onaylaması ---

export interface ManagerCourierPayoutsParams {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  page?: number;
}

export function fetchManagerCourierPayouts(
  params: ManagerCourierPayoutsParams = {}
): Promise<PaginatedResponse<ProcessorPayoutRequest>> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", "20");
  return apiClient.get<PaginatedResponse<ProcessorPayoutRequest>>(
    `/api/couriers/manager/payouts/?${query.toString()}`
  );
}

export function approveManagerCourierPayout(
  payoutId: number,
  payload: PayoutProcessPayload = {}
): Promise<ProcessorPayoutRequest> {
  return apiClient.post<ProcessorPayoutRequest>(
    `/api/couriers/manager/payouts/${payoutId}/approve/`,
    payload
  );
}

export function rejectManagerCourierPayout(
  payoutId: number,
  payload: PayoutProcessPayload = {}
): Promise<ProcessorPayoutRequest> {
  return apiClient.post<ProcessorPayoutRequest>(
    `/api/couriers/manager/payouts/${payoutId}/reject/`,
    payload
  );
}
