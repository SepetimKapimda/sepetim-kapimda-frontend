"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Loader2, PackageCheck, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchManagerDashboard,
  fetchManagerStats,
  type ManagerDashboard,
  type ManagerStats,
} from "@/lib/api/managerCouriers";

type Period = "daily" | "monthly" | "yearly" | "custom";

const periodLabels: Record<Period, string> = {
  daily: "Günlük",
  monthly: "Aylık",
  yearly: "Yıllık",
  custom: "Özel Tarih",
};

const REVENUE_COLOR = "#10B981";
const EXPENSE_COLOR = "#EF4444";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const todayStr = toDateInputValue(new Date());
const weekAgoStr = toDateInputValue(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

function CourierManagerDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const period = (searchParams.get("period") as Period) || "daily";
  const startDate = searchParams.get("start") || weekAgoStr;
  const endDate = searchParams.get("end") || todayStr;

  const [dashboard, setDashboard] = useState<ManagerDashboard | null>(null);
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    fetchManagerDashboard()
      .then(setDashboard)
      .catch((error) => showError(error, "Dashboard bilgisi alınamadı."));
  }, []);

  useEffect(() => {
    setIsLoadingStats(true);
    fetchManagerStats(
      period === "custom" ? { startDate, endDate } : { filter: period }
    )
      .then(setStats)
      .catch((error) => showError(error, "İstatistikler alınamadı."))
      .finally(() => setIsLoadingStats(false));
  }, [period, startDate, endDate]);

  const handlePeriodClick = (value: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "daily") {
      params.delete("period");
    } else {
      params.set("period", value);
    }
    if (value === "custom") {
      if (!params.get("start")) params.set("start", startDate);
      if (!params.get("end")) params.set("end", endDate);
    } else {
      params.delete("start");
      params.delete("end");
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const updateDateParam = (key: "start" | "end", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set(key, value);
    if (key === "start" && !params.get("end")) params.set("end", endDate);
    if (key === "end" && !params.get("start")) params.set("start", startDate);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const rechartsData = (stats?.points ?? []).map((point) => ({
    label: point.label,
    Ciro: point.revenue,
    Gider: point.expense,
  }));

  const statCards = [
    {
      label: "Toplam Teslimat Geliri (Ciro)",
      value: stats ? formatCurrency(stats.total_revenue) : "...",
      icon: Wallet,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Toplam Kurye Gideri",
      value: stats ? formatCurrency(stats.total_expense) : "...",
      icon: TrendingDown,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "Net Kazanç (Operasyon)",
      value: stats ? formatCurrency(stats.net_profit) : "...",
      icon: TrendingUp,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Çıkan Paket Sayısı",
      value: stats ? stats.total_packages.toLocaleString("tr-TR") : "...",
      icon: PackageCheck,
      iconBg: "bg-secondary/20",
      iconColor: "text-secondary-800",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-heading text-2xl font-black text-gray-900">Dashboard</h1>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-1 rounded-full bg-gray-100 p-1">
            {(Object.keys(periodLabels) as Period[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePeriodClick(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  period === value ? "bg-primary text-white shadow-soft" : "text-muted hover:text-charcoal"
                }`}
              >
                {periodLabels[value]}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
                Başlangıç
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => updateDateParam("start", e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
                Bitiş
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => updateDateParam("end", e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {dashboard && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <p className="text-xs font-medium text-muted">Platformdan Alacağım (Net)</p>
            <p className="mt-1 font-heading text-2xl font-black text-charcoal">
              {formatCurrency(dashboard.total_manager_earnings)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <p className="text-xs font-medium text-muted">Aktif Kurye Sayım</p>
            <p className="mt-1 font-heading text-2xl font-black text-charcoal">
              {dashboard.active_couriers_count}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <p className="text-xs font-medium text-muted">Atama Bekleyen Sipariş</p>
            <p className="mt-1 font-heading text-2xl font-black text-charcoal">
              {dashboard.unassigned_orders_count}
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className="mt-1 font-heading text-2xl font-black text-charcoal">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card md:p-6">
        <h2 className="mb-6 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
          <BarChart3 className="h-5 w-5 text-primary" />
          Kazanç ve Gider Analizi
        </h2>

        {isLoadingStats ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-gray-200">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rechartsData.length === 0 ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-muted">
            Seçilen aralıkta veri bulunmuyor.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rechartsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  cursor={{ fill: "rgba(17,24,39,0.04)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Ciro" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Gider" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CourierManagerDashboardPage() {
  return (
    <Suspense fallback={null}>
      <CourierManagerDashboardContent />
    </Suspense>
  );
}
