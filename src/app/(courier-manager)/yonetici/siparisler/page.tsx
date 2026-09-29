"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, ListOrdered, Loader2, Truck } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/format";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import { fetchManagerOrders } from "@/lib/api/managerCouriers";
import type { OrderDetail, OrderStatus } from "@/lib/api/orders";

const PAGE_SIZE = 12;

type StatusFilter = "all" | "waiting" | "on_the_way" | "delivered" | "canceled";
type DateFilter = "all" | "today" | "week" | "month";

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "waiting", label: "Bekliyor" },
  { value: "on_the_way", label: "Yolda" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "canceled", label: "İptal" },
];

const dateFilterOptions: { value: DateFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
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

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

function CourierManagerSiparislerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const statusFilter = (searchParams.get("status") as StatusFilter) || "all";
  const dateFilter = (searchParams.get("date") as DateFilter) || "all";

  const updateFilter = (key: "status" | "date", value: string) => {
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
    setPage(1);
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchManagerOrders({
      status: statusFilter === "all" ? undefined : statusFilter,
      date: dateFilter === "all" ? undefined : dateFilter === "week" ? "weekly" : dateFilter === "month" ? "monthly" : "today",
      page,
      pageSize: PAGE_SIZE,
    })
      .then((data) => {
        setOrders(data.results);
        setCount(data.count);
      })
      .catch((error) => {
        useToastStore
          .getState()
          .showToast("error", error instanceof ApiError ? error.message : "Siparişler alınamadı.");
      })
      .finally(() => setIsLoading(false));
  }, [statusFilter, dateFilter, page]);

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Tüm Siparişler</h1>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 flex items-center gap-1 text-xs font-bold text-muted">
            <ListOrdered className="h-3.5 w-3.5" />
            Durum:
          </span>
          {statusFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFilter("status", option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === option.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-muted hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 flex items-center gap-1 text-xs font-bold text-muted">
            <Calendar className="h-3.5 w-3.5" />
            Zaman:
          </span>
          {dateFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFilter("date", option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                dateFilter === option.value
                  ? "bg-primary text-white"
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-muted">
          Bu filtrelere uygun sipariş bulunamadı.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-2">
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

                <p className="mb-1 text-sm font-bold text-charcoal">{order.addresses.delivery.full_name}</p>
                <p className="mb-3 font-heading text-lg font-black text-charcoal">
                  {formatCurrency(order.order_total)}
                </p>

                <div className="flex items-center gap-1.5 border-t border-gray-100 pt-2 text-xs text-muted">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  {order.assigned_courier ?? "Henüz kurye atanmadı"}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={getTotalPages(count, PAGE_SIZE)}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}

export default function CourierManagerSiparislerPage() {
  return (
    <Suspense fallback={null}>
      <CourierManagerSiparislerContent />
    </Suspense>
  );
}
