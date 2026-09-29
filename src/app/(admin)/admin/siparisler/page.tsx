"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Eye, Loader2, MapPin, Search, X } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/format";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchAdminOrder,
  fetchAdminOrders,
  updateAdminOrder,
  type AdminOrder,
  type AdminOrderDetail,
} from "@/lib/api/adminOrders";
import type { OrderStatus } from "@/lib/api/orders";

type StatusFilter = "all" | OrderStatus;

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "RECEIVED", label: "Sipariş Alındı" },
  { value: "PREPARING", label: "Hazırlanıyor" },
  { value: "WAITING_COURIER", label: "Kurye Bekleniyor" },
  { value: "HANDED_TO_COURIER", label: "Kuryeye Verildi" },
  { value: "ON_THE_WAY", label: "Yolda" },
  { value: "DELIVERED", label: "Teslim Edildi" },
  { value: "CANCELED", label: "İptal Edildi" },
];

const editableStatusOptions: { value: OrderStatus; label: string }[] = [
  { value: "RECEIVED", label: "Sipariş Alındı" },
  { value: "PREPARING", label: "Hazırlanıyor" },
  { value: "WAITING_COURIER", label: "Kurye Bekleniyor" },
  { value: "HANDED_TO_COURIER", label: "Kuryeye Verildi" },
  { value: "ON_THE_WAY", label: "Yolda" },
  { value: "DELIVERED", label: "Teslim Edildi" },
  { value: "CANCELED", label: "İptal Edildi" },
];

const statusBadgeClasses: Record<OrderStatus, string> = {
  RECEIVED: "bg-orange-100 text-orange-700",
  PREPARING: "bg-slate-100 text-slate-700",
  WAITING_COURIER: "bg-amber-100 text-amber-700",
  HANDED_TO_COURIER: "bg-secondary/20 text-secondary-800",
  ON_THE_WAY: "bg-secondary/20 text-secondary-800",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 15;

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

export default function AdminSiparislerPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, startDate, endDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde (aynı filtre/sayfa
  // anahtarıyla) önceki sonuçlar anında gösterilir, arka planda tazelenir.
  const { data, isLoading, mutate } = useSWR(
    ["admin-orders", debouncedSearch, statusFilter, startDate, endDate, currentPage],
    ([, searchValue, status, start, end, page]: [
      string,
      string,
      StatusFilter,
      string,
      string,
      number,
    ]) =>
      fetchAdminOrders({
        status: status === "all" ? undefined : status,
        search: searchValue || undefined,
        startDate: start || undefined,
        endDate: end || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    { onError: (error) => showError(error, "Siparişler alınamadı.") }
  );
  const orders = data?.results ?? [];
  const count = data?.count ?? 0;

  const handleOpenDetail = (order: AdminOrder) => {
    setIsLoadingDetail(true);
    setSelectedOrder(null);
    fetchAdminOrder(order.id)
      .then((detail) => {
        setSelectedOrder(detail);
        setNextStatus(detail.status);
      })
      .catch((error) => showError(error, "Sipariş detayı alınamadı."))
      .finally(() => setIsLoadingDetail(false));
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
    setNextStatus("");
  };

  const isFinalStatus = selectedOrder?.status === "DELIVERED" || selectedOrder?.status === "CANCELED";

  const handleSaveStatus = async () => {
    if (!selectedOrder || !nextStatus || nextStatus === selectedOrder.status) return;
    setIsSavingStatus(true);
    try {
      const updated = await updateAdminOrder(selectedOrder.id, { status: nextStatus });
      setSelectedOrder(updated);
      mutate(
        (current) =>
          current && {
            ...current,
            results: current.results.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
          },
        { revalidate: false }
      );
      useToastStore.getState().showToast("success", `Sipariş #${updated.id} durumu güncellendi.`);
    } catch (error) {
      showError(error, "Sipariş durumu güncellenemedi.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Tüm Siparişler</h1>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-1 flex-col gap-1 sm:min-w-[220px]">
          <label htmlFor="orders-search" className="text-xs font-bold text-muted">
            Ara (Sipariş No, Müşteri Adı)
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="orders-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SM-15 veya Elif Demir"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="orders-status" className="text-xs font-bold text-muted">
            Durum
          </label>
          <select
            id="orders-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="orders-start-date" className="text-xs font-bold text-muted">
              Başlangıç
            </label>
            <input
              id="orders-start-date"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-xs text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="orders-end-date" className="text-xs font-bold text-muted">
              Bitiş
            </label>
            <input
              id="orders-end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-xs text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* Masaüstü: Veri Tablosu */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Sipariş No</th>
                  <th className="px-4 py-3">Tarih / Saat</th>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-bold text-charcoal">#{order.id}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(order.created)}</td>
                    <td className="px-4 py-3 text-charcoal">{order.addresses.delivery.full_name}</td>
                    <td className="px-4 py-3 font-bold text-charcoal">{formatCurrency(order.order_total)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClasses[order.status]}`}
                      >
                        {order.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(order)}
                        aria-label={`#${order.id} sipariş detayı`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                      Bu filtrelere uygun sipariş bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobil: Kompakt Kartlar */}
          <div className="space-y-3 md:hidden">
            {orders.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-muted">
                Bu filtrelere uygun sipariş bulunamadı.
              </div>
            )}
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-sm font-bold text-charcoal">#{order.id}</p>
                    <p className="text-xs text-muted">{formatDateTime(order.created)}</p>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClasses[order.status]}`}
                  >
                    {order.status_display}
                  </span>
                </div>
                <p className="mb-2 text-xs text-muted">{order.addresses.delivery.full_name}</p>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm">
                  <span className="block font-heading font-black text-charcoal">
                    {formatCurrency(order.order_total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(order)}
                    aria-label={`#${order.id} sipariş detayı`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={getTotalPages(count, PAGE_SIZE)}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        </>
      )}

      {/* Sipariş Detayı modalı */}
      {(selectedOrder || isLoadingDetail) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sipariş Detayı"
          onClick={handleCloseDetail}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-popover"
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">Sipariş Detayı</h2>
              <button
                type="button"
                onClick={handleCloseDetail}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoadingDetail || !selectedOrder ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-heading text-base font-black text-charcoal">
                    #{selectedOrder.id}
                  </span>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClasses[selectedOrder.status]}`}
                  >
                    {selectedOrder.status_display}
                  </span>
                </div>

                <div className="mb-5 space-y-2.5 rounded-xl bg-gray-50 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Tarih</span>
                    <span className="font-bold text-charcoal">{formatDateTime(selectedOrder.created)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-muted">Müşteri</span>
                    <span className="text-right font-bold text-charcoal">
                      {selectedOrder.addresses.delivery.full_name}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex shrink-0 items-center gap-1 text-muted">
                      <MapPin className="h-3.5 w-3.5" />
                      Adres
                    </span>
                    <span className="text-right text-charcoal">
                      {selectedOrder.addresses.delivery.neighborhood_display},{" "}
                      {selectedOrder.addresses.delivery.district_display}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Atanmış Kurye</span>
                    <span className="font-bold text-charcoal">
                      {selectedOrder.assigned_courier ?? "Henüz atanmadı"}
                    </span>
                  </div>
                </div>

                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                  Finansal Kırılım
                </h3>
                <div className="mb-5 space-y-2 rounded-xl border border-gray-100 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal">Müşterinin Ödediği Toplam Tutar</span>
                    <span className="font-bold text-charcoal">{formatCurrency(selectedOrder.order_total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Marketin Hakedişi (Market Fiyatı Toplamı)</span>
                    <span className="font-bold text-red-600">
                      - {formatCurrency(selectedOrder.market_price_total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="font-bold text-charcoal">Platform Brüt Kârı</span>
                    <span className="font-heading text-base font-black text-green-600">
                      {formatCurrency(selectedOrder.gross_profit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted">Emirhanlar Payı</span>
                    <span className="font-bold text-charcoal">{formatCurrency(selectedOrder.platform_earnings)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Yönetici Kazancı</span>
                    <span className="font-bold text-charcoal">{formatCurrency(selectedOrder.manager_earnings)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Kurye Kazancı</span>
                    <span className="font-bold text-charcoal">{formatCurrency(selectedOrder.courier_earnings)}</span>
                  </div>
                </div>

                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Durumu Güncelle</h3>
                {isFinalStatus ? (
                  <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-xs text-muted">
                    Sonuçlanmış (Teslim Edildi / İptal Edildi) siparişlerin durumu değiştirilemez.
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      {editableStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSaveStatus}
                      disabled={isSavingStatus || nextStatus === selectedOrder.status}
                      className="shrink-0 whitespace-nowrap rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingStatus ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
