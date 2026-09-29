"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { AlertCircle, ChefHat, Loader2, Truck } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { useToastStore } from "@/store/useToastStore";
import { playNotificationSound } from "@/lib/notificationSound";
import {
  fetchVendorOrders,
  updateVendorOrderStatus,
  type MarketOrderStatusTarget,
} from "@/lib/api/vendorOrders";

const POLL_INTERVAL_MS = 15000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function VendorPanelPage() {
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const knownReceivedIds = useRef<Set<number> | null>(null);

  // SWR'ın `refreshInterval`'ı eski manuel `setInterval`'ın yerini alıyor;
  // ayrıca bu sekmeye her geri dönüşte önceki liste cache'den anında gösterilir.
  const { data: orders = [], isLoading, mutate } = useSWR("vendor-orders", fetchVendorOrders, {
    refreshInterval: POLL_INTERVAL_MS,
    onSuccess: (data) => {
      const receivedIds = new Set(
        data.filter((order) => order.status === "RECEIVED").map((order) => order.id)
      );
      // İlk yüklemede sadece mevcut durumu kaydet — sayfa her açıldığında
      // zaten bekleyen siparişler için sahte bir "yeni sipariş" sesi/toast'ı
      // tetiklenmesin, sadece bir SONRAKI pollde gerçekten yeni gelen için.
      if (knownReceivedIds.current !== null) {
        const newlyArrived = Array.from(receivedIds).filter(
          (id) => !knownReceivedIds.current!.has(id)
        );
        if (newlyArrived.length > 0) {
          useToastStore
            .getState()
            .showToast(
              "success",
              newlyArrived.length === 1
                ? `Yeni sipariş geldi! #${newlyArrived[0]}`
                : `${newlyArrived.length} yeni sipariş geldi!`
            );
          playNotificationSound();
        }
      }
      knownReceivedIds.current = receivedIds;
    },
    onError: (error) => {
      useToastStore
        .getState()
        .showToast("error", error instanceof ApiError ? error.message : "Siparişler alınamadı.");
    },
  });

  const handleAdvance = async (orderId: number, nextStatus: MarketOrderStatusTarget) => {
    setUpdatingId(orderId);
    try {
      await updateVendorOrderStatus(orderId, nextStatus);
      if (nextStatus === "HANDED_TO_COURIER") {
        // Kuryeye verilen sipariş artık bu kanbanın (aktif) kapsamından çıkar.
        mutate((prev) => prev && prev.filter((order) => order.id !== orderId), { revalidate: false });
        useToastStore.getState().showToast("success", `Sipariş #${orderId} kuryeye verildi.`);
      } else {
        mutate(
          (prev) =>
            prev && prev.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order)),
          { revalidate: false }
        );
        useToastStore.getState().showToast("success", `Sipariş #${orderId} hazırlanıyor.`);
      }
    } catch (error) {
      useToastStore
        .getState()
        .showToast("error", error instanceof ApiError ? error.message : "Durum güncellenemedi.");
    } finally {
      setUpdatingId(null);
    }
  };

  const receivedOrders = orders.filter((order) => order.status === "RECEIVED");
  const preparingOrders = orders.filter(
    (order) => order.status === "PREPARING" || order.status === "WAITING_COURIER"
  );

  const columns = [
    {
      key: "received",
      title: "Yeni Gelenler",
      headerClass: "bg-red-50 text-red-600",
      icon: AlertCircle,
      orders: receivedOrders,
    },
    {
      key: "preparing",
      title: "Hazırlanıyor",
      headerClass: "bg-amber-50 text-amber-600",
      icon: ChefHat,
      orders: preparingOrders,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Canlı Siparişler</h1>

      <div className="flex flex-col gap-4 md:flex-row">
        {columns.map(({ key, title, headerClass, icon: Icon, orders: columnOrders }) => (
          <div key={key} className="flex-1 md:w-1/2">
            <div
              className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${headerClass}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {title}
              <span className="ml-auto rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">
                {columnOrders.length}
              </span>
            </div>

            {columnOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-8 text-center text-sm text-muted">
                Bu sütunda sipariş yok.
              </div>
            ) : (
              <div className="space-y-3">
                {columnOrders.map((order) => {
                  const isUpdating = updatingId === order.id;
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-heading text-sm font-bold text-charcoal">
                            {order.addresses.delivery.full_name}
                          </p>
                          <p className="text-xs text-muted">
                            #{order.id} · {formatTime(order.created)}
                          </p>
                        </div>
                        <p className="shrink-0 font-heading text-base font-black text-charcoal">
                          {formatCurrency(order.order_total)}
                        </p>
                      </div>

                      {order.status === "WAITING_COURIER" && (
                        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          Kurye Bekleniyor
                        </span>
                      )}

                      <ul className="mb-3 space-y-0.5 border-t border-gray-100 pt-2">
                        {order.items.map((item) => (
                          <li key={item.id} className="text-xs text-muted">
                            {item.quantity}x {item.product.name}
                          </li>
                        ))}
                      </ul>

                      {order.status === "RECEIVED" && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(order.id, "PREPARING")}
                          disabled={isUpdating}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Onayla ve Hazırla
                        </button>
                      )}

                      {(order.status === "PREPARING" || order.status === "WAITING_COURIER") && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(order.id, "HANDED_TO_COURIER")}
                          disabled={isUpdating}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Truck className="h-3.5 w-3.5" />
                          )}
                          Kuryeye Ver
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
