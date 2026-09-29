import { apiClient } from "@/lib/apiClient";

// schema.yaml MarketFinancePoint — grafik noktaları (tutarlar sayı), kart toplamları string.
export interface MarketFinancePoint {
  label: string;
  start: string;
  order_count: number;
  gross_sales: number;
  coupon_discount: number;
  earnings: number;
}

export interface MarketFinanceSummary {
  filter: string;
  start_date: string;
  end_date: string;
  points: MarketFinancePoint[];
  order_count: number;
  total_gross_sales: string;
  total_coupon_discount: string;
  total_earnings: string;
}

export interface FinanceSummaryParams {
  filter?: "daily" | "weekly" | "monthly" | "yearly";
  startDate?: string;
  endDate?: string;
}

export function fetchMarketFinanceSummary(
  params: FinanceSummaryParams = {}
): Promise<MarketFinanceSummary> {
  const query = new URLSearchParams();
  if (params.startDate && params.endDate) {
    query.set("start_date", params.startDate);
    query.set("end_date", params.endDate);
  } else if (params.filter) {
    query.set("filter", params.filter);
  }
  const qs = query.toString();
  return apiClient.get<MarketFinanceSummary>(
    `/api/markets/finance-summary/${qs ? `?${qs}` : ""}`
  );
}
