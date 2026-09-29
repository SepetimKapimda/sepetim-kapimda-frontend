"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bike, Car, Check, Loader2, MapPin, Truck, UserPlus } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { useToastStore } from "@/store/useToastStore";
import { playNotificationSound } from "@/lib/notificationSound";
import type { OrderDetail } from "@/lib/api/orders";
import {
  assignOrderToCourier,
  fetchManagerCouriers,
  fetchUnassignedOrders,
  type ManagerCourier,
} from "@/lib/api/managerCouriers";

const POLL_INTERVAL_MS = 15000;

// Not: create/update kod (`motorcycle` vb.) kabul ediyor, ama GET yanıtları
// backend'in görünen adını (`vehicle_type: "Motosiklet"`) döndürüyor — ikon
// eşlemesi bu yüzden görünen adın içeriğine göre yapılıyor.
function getVehicleIcon(vehicleType: string): typeof Bike {
  const normalized = vehicleType.toLowerCase();
  if (normalized.includes("oto") || normalized.includes("car")) return Car;
  return Bike;
}

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

export default function CourierManagerAtamaPage() {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [couriers, setCouriers] = useState<ManagerCourier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignOrder, setAssignOrder] = useState<OrderDetail | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const knownOrderIds = useRef<Set<number> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = () => {
      Promise.all([fetchUnassignedOrders(), fetchManagerCouriers(true)])
        .then(([orderList, courierList]) => {
          if (!isMounted) return;
          setOrders(orderList);
          setCouriers(courierList);

          const currentIds = new Set(orderList.map((order) => order.id));
          // İlk yüklemede sadece mevcut durumu kaydet — sayfa her açıldığında
          // zaten atama bekleyen siparişler için sahte bir bildirim tetiklenmesin.
          if (knownOrderIds.current !== null) {
            const newlyArrived = Array.from(currentIds).filter((id) => !knownOrderIds.current!.has(id));
            if (newlyArrived.length > 0) {
              useToastStore
                .getState()
                .showToast(
                  "success",
                  newlyArrived.length === 1
                    ? `Atama bekleyen yeni sipariş! #${newlyArrived[0]}`
                    : `${newlyArrived.length} yeni sipariş atama bekliyor!`
                );
              playNotificationSound();
            }
          }
          knownOrderIds.current = currentIds;
        })
        .catch((error) => {
          if (isMounted) showError(error, "Veriler alınamadı.");
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    };

    load();
    const intervalId = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const openAssignModal = (order: OrderDetail) => {
    setAssignOrder(order);
    setSelectedCourierId(null);
  };

  const closeAssignModal = () => {
    setAssignOrder(null);
    setSelectedCourierId(null);
  };

  const confirmAssign = async () => {
    if (!assignOrder || !selectedCourierId) return;
    setIsAssigning(true);
    try {
      await assignOrderToCourier(assignOrder.id, selectedCourierId);
      setOrders((prev) => prev.filter((order) => order.id !== assignOrder.id));
      useToastStore.getState().showToast("success", `Sipariş #${assignOrder.id} kuryeye atandı.`);
      closeAssignModal();
    } catch (error) {
      showError(error, "Sipariş atanamadı.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Aktif Saha Operasyonu</h1>

      <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
        <Truck className="h-5 w-5 text-primary" />
        Atama Bekleyen Siparişler
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
          {orders.length}
        </span>
      </h2>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-8 text-center text-sm text-muted">
          Şu an atama bekleyen sipariş yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
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
                {order.status === "WAITING_COURIER" && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    Kurye Bekliyor
                  </span>
                )}
              </div>

              <p className="mb-3 font-heading text-xl font-black text-charcoal">
                {formatCurrency(order.order_total)}
              </p>

              <button
                type="button"
                onClick={() => openAssignModal(order)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4" />
                Kurye Ata
              </button>
            </div>
          ))}
        </div>
      )}

      {assignOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kurye Ata"
          onClick={closeAssignModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-heading text-lg font-bold text-charcoal">Kurye Ata</h2>
            </div>
            <p className="mb-4 text-sm text-muted">
              #{assignOrder.id} numaralı siparişi hangi kuryenize atamak istersiniz?
            </p>

            {couriers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-muted">
                <AlertTriangle className="mx-auto mb-1.5 h-5 w-5 text-amber-500" />
                Henüz aktif bir kuryeniz yok.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {couriers.map((courier) => {
                  const isSelected = selectedCourierId === courier.id;
                  const VehicleIcon = getVehicleIcon(courier.vehicle_type);
                  return (
                    <button
                      key={courier.id}
                      type="button"
                      onClick={() => setSelectedCourierId(courier.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 p-3 text-left transition ${
                        isSelected ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <VehicleIcon className="h-4 w-4 shrink-0 text-muted" />
                        <span>
                          <span className="block text-sm font-bold text-charcoal">
                            {courier.first_name} {courier.last_name}
                          </span>
                          <span className="block text-xs text-muted">
                            {courier.vehicle_type}
                            {!courier.is_available && " · Şu an meşgul olabilir"}
                          </span>
                        </span>
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeAssignModal}
                disabled={isAssigning}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmAssign}
                disabled={!selectedCourierId || isAssigning}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
                Ata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
