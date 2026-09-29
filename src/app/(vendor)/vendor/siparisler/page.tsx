"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import { fetchVendorOrderHistory } from "@/lib/api/vendorOrders";
import type { OrderDetail } from "@/lib/api/orders";

type StatusFilter = "all" | "delivered" | "canceled";
type DateFilter = "all" | "today" | "week" | "month" | "custom";

const statusBadgeClasses: Record<string, string> = {
  DELIVERED: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-700",
};

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "canceled", label: "İptal Edildi" },
];

const dateFilterOptions: { value: DateFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
  { value: "custom", label: "Özel Tarih" },
];

const PAGE_SIZE = 6;

function defaultLastWeekDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

function formatTimeOnly(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function VendorSiparislerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  const statusFilter = (searchParams.get("status") as StatusFilter) || "all";
  const dateFilter = (searchParams.get("date") as DateFilter) || "all";
  const startParam = searchParams.get("start") || defaultLastWeekDate(6);
  const endParam = searchParams.get("end") || defaultLastWeekDate(0);
  const currentPage = Math.max(Number(searchParams.get("page")) || 1, 1);

  const updateFilter = (key: "status" | "date", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
      if (key === "date") {
        params.delete("start");
        params.delete("end");
      }
    } else {
      params.set(key, value);
    }
    if (key === "date" && value === "custom") {
      if (!params.get("start")) params.set("start", defaultLastWeekDate(6));
      if (!params.get("end")) params.set("end", defaultLastWeekDate(0));
    }
    params.delete("page");
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const updateDateParam = (key: "start" | "end", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", "custom");
    params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde önceki sonuçlar anında
  // gösterilir, arka planda tazelenir.
  const { data, isLoading } = useSWR(
    ["vendor-order-history", statusFilter, dateFilter, startParam, endParam],
    ([, status, date, start, end]: [string, StatusFilter, DateFilter, string, string]) =>
      fetchVendorOrderHistory({
        status: status === "all" ? undefined : status,
        date: date === "all" ? undefined : date,
        start: date === "custom" ? start : undefined,
        end: date === "custom" ? end : undefined,
      }),
    {
      onError: (error) => {
        useToastStore
          .getState()
          .showToast("error", error instanceof ApiError ? error.message : "Siparişler alınamadı.");
      },
    }
  );
  // Backend bu uçta sayfalama parametresi kabul etmiyor (tek seferde tüm
  // filtrelenmiş sonucu döner); sayfalama istemci tarafında yapılır.
  const orders = data?.results ?? [];
  const count = orders.length;

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const clampedPage = Math.min(currentPage, totalPages);
  const paginatedOrders = orders.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  return (
    <div className="relative">
      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Geçmiş Siparişler</h1>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 flex items-center gap-1 text-xs font-bold text-muted">
            <Calendar className="h-3.5 w-3.5" />
            Tarih:
          </span>
          {dateFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFilter("date", option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                dateFilter === option.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-muted hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {dateFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white p-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="start-date" className="text-xs font-bold text-muted">
                Başlangıç
              </label>
              <input
                id="start-date"
                type="date"
                value={startParam}
                max={endParam}
                onChange={(e) => updateDateParam("start", e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="end-date" className="text-xs font-bold text-muted">
                Bitiş
              </label>
              <input
                id="end-date"
                type="date"
                value={endParam}
                min={startParam}
                onChange={(e) => updateDateParam("end", e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 flex items-center gap-1 text-xs font-bold text-muted">
            <Package className="h-3.5 w-3.5" />
            Durum:
          </span>
          {statusFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFilter("status", option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === option.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-muted hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-muted">
          Bu filtrelere uygun sipariş bulunamadı.
        </div>
      ) : (
        <>
          {/* Masaüstü: Veri Tablosu */}
          <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Sipariş No</th>
                  <th className="px-4 py-3">Tarih / Saat</th>
                  <th className="px-4 py-3">Teslim Saati</th>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Kurye</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="cursor-pointer border-t border-gray-100 transition hover:bg-orange-50/60"
                  >
                    <td className="px-4 py-3 font-bold text-charcoal">#{order.id}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(order.created)}</td>
                    <td className="px-4 py-3 text-muted">
                      {order.status === "DELIVERED" ? formatTimeOnly(order.delivered_at) : "-"}
                    </td>
                    <td className="px-4 py-3 text-charcoal">{order.addresses.delivery.full_name}</td>
                    <td className="px-4 py-3 font-bold text-charcoal">{formatCurrency(order.order_total)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClasses[order.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {order.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{order.assigned_courier ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil: Kompakt Kartlar */}
          <div className="space-y-3 md:hidden">
            {paginatedOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-card transition hover:border-orange-200"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-sm font-bold text-charcoal">#{order.id}</p>
                    <p className="text-xs text-muted">{formatDateTime(order.created)}</p>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClasses[order.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {order.status_display}
                  </span>
                </div>
                <p className="mb-1 text-sm font-bold text-charcoal">{order.addresses.delivery.full_name}</p>
                <p className="mb-2 font-heading text-lg font-black text-charcoal">
                  {formatCurrency(order.order_total)}
                </p>
                <div className="flex items-center gap-1.5 border-t border-gray-100 pt-2 text-xs text-muted">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  {order.assigned_courier ?? "Kurye atanmadı"}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => updatePage(clampedPage - 1)}
              disabled={clampedPage <= 1}
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-charcoal transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Önceki
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => updatePage(page)}
                aria-current={page === clampedPage ? "page" : undefined}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition ${
                  page === clampedPage
                    ? "bg-orange-500 text-white"
                    : "border border-gray-200 bg-white text-charcoal hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => updatePage(clampedPage + 1)}
              disabled={clampedPage >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-charcoal transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sonraki
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-charcoal">Sipariş Özeti</h2>
                <p className="text-xs text-muted">#{selectedOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                  <Package className="h-3.5 w-3.5" />
                  Sipariş İçeriği
                </h3>
                <ul className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm text-charcoal">
                      <span>{item.product.name}</span>
                      <span className="font-bold">{item.quantity} adet</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Sipariş Süreci</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <Package className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 text-sm text-charcoal">Sipariş Alındı</span>
                    <span className="text-xs font-bold text-muted">{formatTimeOnly(selectedOrder.created)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        selectedOrder.status === "DELIVERED"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {selectedOrder.status === "DELIVERED" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="flex-1 text-sm text-charcoal">{selectedOrder.status_display}</span>
                    <span className="text-xs font-bold text-muted">
                      {formatTimeOnly(selectedOrder.delivered_at ?? selectedOrder.canceled_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Kurye</h3>
                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                  <User className="h-4 w-4 shrink-0 text-muted" />
                  <span className="font-bold text-charcoal">
                    {selectedOrder.assigned_courier ?? "Kurye atanmadı"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VendorSiparislerPage() {
  return (
    <Suspense fallback={null}>
      <VendorSiparislerContent />
    </Suspense>
  );
}
