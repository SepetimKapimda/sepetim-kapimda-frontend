"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Clock,
  CreditCard,
  History,
  Info,
  ListChecks,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Settings,
  X,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/format";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import { playNotificationSound } from "@/lib/notificationSound";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchCourierAvailability,
  fetchCourierHistory,
  fetchCourierMyOrders,
  fetchCourierStats,
  updateCourierAvailability,
  updateCourierOrderStatus,
  type CourierStats,
} from "@/lib/api/courier";
import type { OrderDetail, OrderStatus } from "@/lib/api/orders";

type PaymentMethod = "cash" | "card";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

type HistoryDateFilter = "all" | "today" | "week" | "month";
type HistoryPaymentFilter = "all" | PaymentMethod;

const historyDateFilterOptions: { value: HistoryDateFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
];

const historyPaymentFilterOptions: { value: HistoryPaymentFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "cash", label: "Nakit" },
  { value: "card", label: "Kredi Kartı" },
];

const HISTORY_PAGE_SIZE = 20;
const ACTIVE_POLL_INTERVAL_MS = 15000;

function toTelHref(phone: string): string {
  const nationalDigits = phone.replace(/\D/g, "").replace(/^0/, "");
  return `tel:+90${nationalDigits}`;
}

type ActiveOrderStatus = Extract<OrderStatus, "HANDED_TO_COURIER" | "ON_THE_WAY">;

const statusLabels: Record<ActiveOrderStatus, string> = {
  HANDED_TO_COURIER: "Teslimat Bekliyor",
  ON_THE_WAY: "Yolda",
};

const statusBadgeClasses: Record<ActiveOrderStatus, string> = {
  HANDED_TO_COURIER: "bg-secondary/20 text-secondary-800",
  ON_THE_WAY: "bg-primary/10 text-primary",
};

type PanelTab = "active" | "history";

export default function CourierPanelPage() {
  return (
    <Suspense fallback={null}>
      <CourierPanelContent />
    </Suspense>
  );
}

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

function CourierPanelContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const [activeOrders, setActiveOrders] = useState<OrderDetail[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<PanelTab>("active");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  const [historyOrders, setHistoryOrders] = useState<OrderDetail[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [stats, setStats] = useState<CourierStats | null>(null);

  useEffect(() => {
    fetchCourierStats()
      .then(setStats)
      .catch((error) => showError(error, "Kazanç istatistikleri alınamadı."));
  }, []);

  const historyDateFilter = (searchParams.get("date") as HistoryDateFilter) || "all";
  const historyPaymentFilter = (searchParams.get("payment") as HistoryPaymentFilter) || "all";

  const updateHistoryFilter = (key: "date" | "payment", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    fetchCourierAvailability()
      .then((data) => setIsAvailable(data.is_available))
      .catch((error) => showError(error, "Müsaitlik durumu alınamadı."));
  }, []);

  const knownOrderIds = useRef<Set<number> | null>(null);

  const loadActiveOrders = useCallback(() => {
    fetchCourierMyOrders(1, 50)
      .then((data) => {
        setActiveOrders(data.results);

        const currentIds = new Set(data.results.map((order) => order.id));
        // İlk yüklemede sadece mevcut durumu kaydet — sayfa her açıldığında
        // zaten atanmış görevler için sahte bir bildirim tetiklenmesin.
        if (knownOrderIds.current !== null) {
          const newlyArrived = Array.from(currentIds).filter((id) => !knownOrderIds.current!.has(id));
          if (newlyArrived.length > 0) {
            useToastStore
              .getState()
              .showToast(
                "success",
                newlyArrived.length === 1
                  ? `Yeni teslimat görevi atandı! #${newlyArrived[0]}`
                  : `${newlyArrived.length} yeni teslimat görevi atandı!`
              );
            playNotificationSound();
          }
        }
        knownOrderIds.current = currentIds;
      })
      .catch((error) => showError(error, "Aktif görevler alınamadı."))
      .finally(() => setIsLoadingActive(false));
  }, []);

  useEffect(() => {
    loadActiveOrders();
    const intervalId = setInterval(loadActiveOrders, ACTIVE_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [loadActiveOrders]);

  useEffect(() => {
    setIsLoadingHistory(true);
    setHistoryPage(1);
    fetchCourierHistory({
      date: historyDateFilter === "all" ? undefined : historyDateFilter === "week" ? "weekly" : historyDateFilter === "month" ? "monthly" : "today",
      payment: historyPaymentFilter === "all" ? undefined : historyPaymentFilter,
      page: 1,
      pageSize: HISTORY_PAGE_SIZE,
    })
      .then((data) => {
        setHistoryOrders(data.results);
        setHistoryCount(data.count);
      })
      .catch((error) => showError(error, "Geçmiş teslimatlar alınamadı."))
      .finally(() => setIsLoadingHistory(false));
  }, [historyDateFilter, historyPaymentFilter]);

  useEffect(() => {
    if (historyPage === 1) return;
    setIsLoadingHistory(true);
    fetchCourierHistory({
      date: historyDateFilter === "all" ? undefined : historyDateFilter === "week" ? "weekly" : historyDateFilter === "month" ? "monthly" : "today",
      payment: historyPaymentFilter === "all" ? undefined : historyPaymentFilter,
      page: historyPage,
      pageSize: HISTORY_PAGE_SIZE,
    })
      .then((data) => {
        setHistoryOrders(data.results);
        setHistoryCount(data.count);
      })
      .catch((error) => showError(error, "Geçmiş teslimatlar alınamadı."))
      .finally(() => setIsLoadingHistory(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage]);

  const handleToggleAvailability = async () => {
    setIsTogglingAvailability(true);
    try {
      const data = await updateCourierAvailability(!isAvailable);
      setIsAvailable(data.is_available);
    } catch (error) {
      showError(error, "Müsaitlik durumu güncellenemedi.");
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const handleSetOnTheWay = async (orderId: number) => {
    setUpdatingOrderId(orderId);
    try {
      await updateCourierOrderStatus(orderId, "ON_THE_WAY");
      setActiveOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: "ON_THE_WAY" } : order))
      );
    } catch (error) {
      showError(error, "Sipariş güncellenemedi.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeliver = async (orderId: number) => {
    setUpdatingOrderId(orderId);
    try {
      await updateCourierOrderStatus(orderId, "DELIVERED");
      setActiveOrders((prev) => prev.filter((order) => order.id !== orderId));
      useToastStore.getState().showToast("success", `Sipariş #${orderId} teslim edildi.`);
    } catch (error) {
      showError(error, "Sipariş teslim edilemedi.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const hasActiveHistoryFilters = historyDateFilter !== "all" || historyPaymentFilter !== "all";

  return (
    <>
      <div className="mx-auto max-w-xl px-4 pb-10 pt-6 sm:px-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Hoş geldin,</p>
          <h1 className="font-heading text-2xl font-black text-gray-900">
            {user?.firstName || user?.username} {user?.lastName ? `(${user.lastName[0]}.)` : ""}
          </h1>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/kurye/ayarlar")}
            aria-label="Profil ve Ayarlar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted shadow-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={isAvailable}
            aria-label="Müsaitlik durumunu değiştir"
            disabled={isTogglingAvailability}
            onClick={handleToggleAvailability}
            className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl bg-white px-3 py-2 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:opacity-60"
          >
            <span className={`text-xs font-bold ${isAvailable ? "text-primary" : "text-muted"}`}>
              {isAvailable ? "Müsait" : "Molada"}
            </span>
            <span
              className={`relative inline-block h-6 w-12 shrink-0 rounded-full transition-colors ${
                isAvailable ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isAvailable ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </span>
          </button>
        </div>
      </header>

      <section className="mb-6 rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-5 text-white shadow-card">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/90">
          <PackageCheck className="h-4 w-4" />
          Toplam Kazanç
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-white/80">Toplam Zamanlar Kazancı</p>
            <p className="font-heading text-3xl font-black">
              {stats ? formatCurrency(stats.total_earnings) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">Tamamlanan Teslimat</p>
            <p className="flex items-center justify-end gap-1.5 font-heading text-xl font-bold">
              <PackageCheck className="h-5 w-5" />
              {stats ? stats.total_deliveries : "—"}
            </p>
          </div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition ${
            activeTab === "active" ? "bg-white text-primary shadow-soft" : "text-muted"
          }`}
        >
          <ListChecks className="h-4 w-4" />
          Aktif Görevler
          <span
            className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
              activeTab === "active" ? "bg-primary/10 text-primary" : "bg-gray-200 text-muted"
            }`}
          >
            {activeOrders.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition ${
            activeTab === "history" ? "bg-white text-primary shadow-soft" : "text-muted"
          }`}
        >
          <History className="h-4 w-4" />
          Geçmiş Teslimatlar
          <span
            className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
              activeTab === "history" ? "bg-primary/10 text-primary" : "bg-gray-200 text-muted"
            }`}
          >
            {historyCount}
          </span>
        </button>
      </div>

      {activeTab === "history" && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs font-bold text-muted">Tarih:</span>
            {historyDateFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateHistoryFilter("date", option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  historyDateFilter === option.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-muted hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs font-bold text-muted">Ödeme:</span>
            {historyPaymentFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateHistoryFilter("payment", option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  historyPaymentFilter === option.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-muted hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "active" ? (
        isLoadingActive ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {activeOrders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-muted">Şu an sana atanmış aktif bir görev yok.</p>
              </div>
            )}

            <div className="space-y-3">
              {activeOrders.map((order) => {
                const status = order.status as ActiveOrderStatus;
                const isUpdating = updatingOrderId === order.id;
                return (
                  <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-heading text-base font-bold text-charcoal">
                          {order.addresses.delivery.full_name}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-muted">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {order.addresses.delivery.neighborhood_display}, {order.addresses.delivery.district_display}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClasses[status]}`}>
                          {statusLabels[status]}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          aria-label="Sipariş Detayları"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-muted transition hover:bg-gray-200 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <a
                      href={toTelHref(order.addresses.delivery.phone)}
                      className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      Müşteriyi Ara · {order.addresses.delivery.phone}
                    </a>

                    <div
                      className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${
                        order.payment_method === "cash" ? "bg-green-50 text-green-700" : "bg-secondary/15 text-secondary-800"
                      }`}
                    >
                      {order.payment_method === "cash" ? (
                        <Banknote className="h-4 w-4 shrink-0" />
                      ) : (
                        <CreditCard className="h-4 w-4 shrink-0" />
                      )}
                      {order.payment_method_display}
                    </div>

                    {order.courier_note && (
                      <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {order.courier_note}
                      </div>
                    )}

                    {status === "HANDED_TO_COURIER" && (
                      <button
                        type="button"
                        onClick={() => handleSetOnTheWay(order.id)}
                        disabled={isUpdating}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                        Yola Çık
                      </button>
                    )}

                    {status === "ON_THE_WAY" && (
                      <button
                        type="button"
                        onClick={() => handleDeliver(order.id)}
                        disabled={isUpdating}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 text-sm font-bold text-charcoal shadow-soft transition hover:bg-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                        Teslim Et
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )
      ) : isLoadingHistory ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : historyOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-muted">
            {hasActiveHistoryFilters
              ? "Bu filtrelere uygun geçmiş teslimat bulunamadı."
              : "Henüz tamamlanmış bir teslimatın yok."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {historyOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    {/* KVKK: backend zaten "S*** V***" biçiminde maskeli döner. */}
                    <p className="font-heading text-base font-bold text-charcoal">
                      {order.addresses.delivery.full_name}
                    </p>
                    <p className="flex items-center gap-1 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {order.addresses.delivery.neighborhood_display}, {order.addresses.delivery.district_display}
                    </p>
                  </div>
                  <span className="shrink-0 font-heading text-lg font-black text-charcoal">
                    {formatCurrency(order.order_total)}
                  </span>
                </div>

                <div className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-gray-50 py-2.5 text-sm font-bold text-muted">
                  <Phone className="h-4 w-4 shrink-0" />
                  {order.addresses.delivery.phone}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-muted">
                  <span>
                    {order.delivered_at ? formatDateTime(order.delivered_at) : formatDateTime(order.created)}
                  </span>
                  <span className="font-bold text-green-600">{order.status_display}</span>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={historyPage}
            totalPages={getTotalPages(historyCount, HISTORY_PAGE_SIZE)}
            onPageChange={setHistoryPage}
            className="mt-4"
          />
        </>
      )}
      </div>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-popover sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-charcoal">Sipariş Detayları</h2>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-gray-100 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2 text-muted">
                  <Clock className="h-4 w-4 shrink-0" />
                  Sipariş Tarihi ve Saati
                </span>
                <span className="font-bold text-charcoal">{formatDateTime(selectedOrder.created)}</span>
              </div>

              <div className="flex items-center justify-between py-3 text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <Navigation className="h-4 w-4 shrink-0" />
                  Toplam Mesafe
                </span>
                <span className="font-bold text-charcoal">{Number(selectedOrder.distance_km).toFixed(1)} KM</span>
              </div>

              <div className="flex items-center justify-between py-3 text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <Clock className="h-4 w-4 shrink-0" />
                  Tahmini Süre
                </span>
                <span className="font-bold text-charcoal">{selectedOrder.eta_minutes} dk</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="mt-4 w-full rounded-xl bg-gray-100 py-3 text-sm font-bold text-charcoal transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
