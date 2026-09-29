"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  BarChart3,
  CircleDollarSign,
  Layers,
  Loader2,
  Package,
  PiggyBank,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchAdminDashboardStats,
  type AdminDashboardRange,
  type AdminDashboardStats,
} from "@/lib/api/adminDashboard";

type DateFilter = AdminDashboardRange | "custom";

const dateFilterOptions: { value: DateFilter; label: string }[] = [
  { value: "24h", label: "Son 24 Saat" },
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
  { value: "1y", label: "Son 1 Yıl" },
  { value: "custom", label: "Özel Tarih" },
];

const ORDER_COLOR = "#334155";
const REVENUE_COLOR = "#F97316";

export default function AdminPanelPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const canFetchCustomRange = dateFilter !== "custom" || Boolean(customStart && customEnd);

  // SWR anahtarı sekmeler arası dolaşırken (bu sayfaya her dönüşte) önceki
  // veriyi cache'den anında gösterir, arka planda sessizce tazeler — bu
  // yüzden `isLoading` sadece bu anahtar için HİÇ veri yokken true olur.
  const { data: stats, isLoading } = useSWR<AdminDashboardStats>(
    canFetchCustomRange ? ["admin-dashboard-stats", dateFilter, customStart, customEnd] : null,
    ([, filter, start, end]: [string, DateFilter, string, string]) =>
      fetchAdminDashboardStats(filter === "custom" ? { start, end } : { range: filter }),
    {
      onError: (error) => {
        useToastStore
          .getState()
          .showToast("error", error instanceof ApiError ? error.message : "İstatistikler alınamadı.");
      },
    }
  );

  const chartData =
    stats?.order_volume_chart.map((point, i) => ({
      label: point.label,
      Sipariş: point.order_count,
      Ciro: stats.revenue_trend_chart[i]?.revenue ?? 0,
    })) ?? [];

  const statCards = stats
    ? [
        {
          label: "Toplam Ciro",
          description: "Müşteri Ödemeleri",
          value: formatCurrency(stats.total_revenue),
          icon: Wallet,
          iconBg: "bg-slate-100",
          iconColor: "text-slate-700",
          valueColor: "text-charcoal",
          footer: null as string | null,
        },
        {
          label: "Brüt Kâr",
          description: "Markup + Teslimat",
          value: formatCurrency(stats.gross_profit),
          icon: Layers,
          iconBg: "bg-slate-100",
          iconColor: "text-slate-700",
          valueColor: "text-charcoal",
          footer: null,
        },
        {
          label: "Admin Net Geliri",
          description: "Platform Payı",
          value: formatCurrency(stats.admin_net_income),
          icon: PiggyBank,
          iconBg: "bg-green-50",
          iconColor: "text-green-600",
          valueColor: "text-green-600",
          footer: "Admin'in gerçek kazancı",
        },
        {
          label: "Kurye Yöneticisi Brüt Payı",
          description: "Havuzdan Kalan",
          value: formatCurrency(stats.manager_gross_share),
          icon: Truck,
          iconBg: "bg-orange-50",
          iconColor: "text-orange-600",
          valueColor: "text-orange-600",
          footer: null,
        },
        {
          label: "Toplam Paket & Kurye Hakedişi",
          description: `${stats.total_packages.toLocaleString("tr-TR")} Paket`,
          value: `${formatCurrency(stats.courier_expense_total)} Gider`,
          icon: Package,
          iconBg: "bg-red-50",
          iconColor: "text-red-600",
          valueColor: "text-red-600",
          footer: "Paket başına sabit kurye ücreti",
        },
        {
          label: "Kurye Yöneticisi Net Kâr",
          description: "Brüt Pay - Gider",
          value: formatCurrency(stats.manager_net_profit),
          icon: CircleDollarSign,
          iconBg: "bg-green-50",
          iconColor: "text-green-600",
          valueColor: "text-green-600",
          footer: "Tüm kurye ödemeleri düşüldükten sonra",
        },
      ]
    : [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-heading text-2xl font-black text-gray-900">Genel Bakış</h1>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-1 rounded-full bg-gray-100 p-1">
            {dateFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDateFilter(option.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  dateFilter === option.value
                    ? "bg-orange-500 text-white shadow-soft"
                    : "text-muted hover:text-charcoal"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
                Başlangıç
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
                Bitiş
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {isLoading || !stats ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted">Bekleyen Sipariş</p>
              <p className="mt-1 font-heading text-xl font-black text-charcoal">{stats.pending_orders}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted">Toplam Kullanıcı</p>
              <p className="mt-1 font-heading text-xl font-black text-charcoal">{stats.total_users}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted">Pazarlama İzni Veren</p>
              <p className="mt-1 font-heading text-xl font-black text-charcoal">{stats.marketing_opt_in}</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map(
              ({ label, description, value, icon: Icon, iconBg, iconColor, valueColor, footer }) => (
                <div key={label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-muted">
                    {label} <span className="text-muted/70">({description})</span>
                  </p>
                  <p className={`mt-1 font-heading text-2xl font-black ${valueColor}`}>{value}</p>
                  {footer && <p className="mt-1 text-xs font-bold text-muted">{footer}</p>}
                </div>
              )
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-6 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
                <BarChart3 className="h-5 w-5 text-slate-700" />
                Sipariş Hacmi
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value) => `${Number(value).toLocaleString("tr-TR")} sipariş`}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 8px 24px -4px rgba(17,24,39,0.12)",
                        fontSize: 13,
                      }}
                      cursor={{ fill: "rgba(17,24,39,0.04)" }}
                    />
                    <Bar dataKey="Sipariş" fill={ORDER_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-6 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                Ciro Trendi
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={REVENUE_COLOR} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={REVENUE_COLOR} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) =>
                        value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
                      }
                    />
                    <Tooltip
                      formatter={(value) => `${Number(value).toLocaleString("tr-TR")} ₺`}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 8px 24px -4px rgba(17,24,39,0.12)",
                        fontSize: 13,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Ciro"
                      stroke={REVENUE_COLOR}
                      fill="url(#adminRevenueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
