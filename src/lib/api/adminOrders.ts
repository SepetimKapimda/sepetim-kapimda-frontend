import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";
import type { OrderAddress, OrderItemDetail, OrderStatus, PaymentMethod } from "@/lib/api/orders";

// schema.yaml AdminOrder — müşteri siparişine ek olarak finansal kırılım.
export interface AdminOrder {
  id: number;
  user: string;
  created: string;
  updated: string;
  delivered_at: string | null;
  canceled_at: string | null;
  status: OrderStatus;
  status_display: string;
  assigned_courier: string | null;
  distance_km: string;
  customer_courier_fee: string;
  coupon_discount: string;
  order_total: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  courier_note: string | null;
  items: OrderItemDetail[];
  addresses: { delivery: OrderAddress; billing: OrderAddress };
  eta_minutes: number;
  coupon: string;
  package_count: number;
  total_product_market_price: string;
  total_product_selling_price: string;
  market_price_total: string;
  gross_profit: string;
  platform_earnings: string;
  manager_earnings: string;
  courier_earnings: string;
  customer_ip: string | null;
}

// schema.yaml AdminOrderDetail — AdminOrder + hukuki loglar/sözleşme snapshot'ı.
export interface AdminOrderDetail extends AdminOrder {
  obf_accepted_at: string | null;
  mss_accepted_at: string | null;
  contract_snapshot: unknown;
}

export interface FetchAdminOrdersParams {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}

export function fetchAdminOrders(
  params: FetchAdminOrdersParams = {}
): Promise<PaginatedResponse<AdminOrder>> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);
  if (params.search) query.set("search", params.search);
  if (params.userId) query.set("userId", String(params.userId));
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 20));
  return apiClient.get<PaginatedResponse<AdminOrder>>(`/api/admin/orders/?${query.toString()}`);
}

export function fetchAdminOrder(orderId: number): Promise<AdminOrderDetail> {
  return apiClient.get<AdminOrderDetail>(`/api/admin/orders/${orderId}/`);
}

export interface UpdateAdminOrderPayload {
  status?: OrderStatus;
  /** Atanacak kuryenin User ID'si */
  assigned_courier?: number;
}

// Sonuçlanmış (DELIVERED/CANCELED) siparişler değiştirilemez.
export function updateAdminOrder(
  orderId: number,
  payload: UpdateAdminOrderPayload
): Promise<AdminOrderDetail> {
  return apiClient.patch<AdminOrderDetail>(`/api/admin/orders/${orderId}/`, payload);
}
