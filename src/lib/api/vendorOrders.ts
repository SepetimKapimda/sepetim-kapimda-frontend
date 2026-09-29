import { apiClient } from "@/lib/apiClient";
import type { OrderDetail } from "@/lib/api/orders";

// schema.yaml GET /api/markets/orders/ — canlı kanban, sayfasız düz dizi döner
// (RECEIVED, PREPARING, WAITING_COURIER durumundaki siparişler).
export function fetchVendorOrders(): Promise<OrderDetail[]> {
  return apiClient.get<OrderDetail[]>("/api/markets/orders/");
}

// schema.yaml MarketOrderStatusEnum: sadece PREPARING veya HANDED_TO_COURIER kabul eder.
export type MarketOrderStatusTarget = "PREPARING" | "HANDED_TO_COURIER";

export function updateVendorOrderStatus(
  orderId: number,
  status: MarketOrderStatusTarget
): Promise<{ status: string }> {
  return apiClient.patch<{ status: string }>(`/api/markets/orders/${orderId}/status/`, { status });
}

export interface VendorOrderHistoryParams {
  status?: "delivered" | "canceled";
  date?: "today" | "week" | "month" | "custom";
  start?: string;
  end?: string;
}

// schema.yaml GET /api/markets/orders/history/ — teslim edilmiş/iptal edilmiş siparişler (sayfalı).
export function fetchVendorOrderHistory(
  params: VendorOrderHistoryParams = {}
): Promise<{ count: number; next: string | null; previous: string | null; results: OrderDetail[] }> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.date) query.set("date", params.date);
  if (params.start) query.set("start", params.start);
  if (params.end) query.set("end", params.end);
  const qs = query.toString();
  return apiClient.get(`/api/markets/orders/history/${qs ? `?${qs}` : ""}`);
}
