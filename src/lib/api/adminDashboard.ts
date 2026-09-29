import { apiClient } from "@/lib/apiClient";

export interface AdminOrderVolumePoint {
  label: string;
  start: string;
  order_count: number;
}

export interface AdminRevenuePoint {
  label: string;
  start: string;
  revenue: number;
}

// schema.yaml AdminDashboardStats — pencerede TESLİM EDİLEN siparişlerden platform finansı.
export interface AdminDashboardStats {
  range: string;
  start_date: string;
  end_date: string;
  order_count: number;
  total_revenue: string;
  gross_profit: string;
  admin_net_income: string;
  manager_gross_share: string;
  total_packages: number;
  courier_expense_total: string;
  manager_net_profit: string;
  order_volume_chart: AdminOrderVolumePoint[];
  revenue_trend_chart: AdminRevenuePoint[];
  pending_orders: number;
  total_users: number;
  marketing_opt_in: number;
}

export type AdminDashboardRange = "24h" | "7d" | "30d" | "1y";

export interface FetchAdminDashboardParams {
  range?: AdminDashboardRange;
  start?: string;
  end?: string;
}

export function fetchAdminDashboardStats(
  params: FetchAdminDashboardParams = {}
): Promise<AdminDashboardStats> {
  const query = new URLSearchParams();
  if (params.start && params.end) {
    query.set("start", params.start);
    query.set("end", params.end);
  } else if (params.range) {
    query.set("range", params.range);
  }
  const qs = query.toString();
  return apiClient.get<AdminDashboardStats>(`/api/dashboard/stats/${qs ? `?${qs}` : ""}`);
}
