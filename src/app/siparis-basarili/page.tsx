"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Clock, Hash } from "lucide-react";
import { fetchOrder, type OrderDetail } from "@/lib/api/orders";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");

  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    const orderId = Number(orderIdParam);
    if (!orderIdParam || !Number.isFinite(orderId)) return;
    fetchOrder(orderId)
      .then(setOrder)
      .catch(() => {
        // Sipariş özeti alınamazsa aşağıdaki genel metinler gösterilmeye devam eder.
      });
  }, [orderIdParam]);

  const trackingHref = orderIdParam ? `/siparis-takip/${orderIdParam}` : "/hesabim";

  return (
    <div className="flex min-h-[calc(100vh-73px)] w-full items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-popover sm:p-10">
        <CheckCircle className="h-20 w-20 text-green-500" strokeWidth={1.5} />

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-bold text-charcoal sm:text-3xl">
            Siparişiniz Başarıyla Alındı!
          </h1>
          <p className="text-sm text-muted">
            Siparişin hazırlanmaya başladı, en kısa sürede kapında olacak.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl bg-offwhite px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Hash className="h-4 w-4 text-primary" />
              Sipariş No
            </span>
            <span className="text-sm font-bold text-charcoal">
              #{orderIdParam ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-offwhite px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Clock className="h-4 w-4 text-primary" />
              Tahmini Varış Süresi
            </span>
            <span className="text-sm font-bold text-charcoal">
              {order ? `${order.eta_minutes} Dakika` : "Hesaplanıyor..."}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link
            href={trackingHref}
            className="flex w-full items-center justify-center rounded-xl bg-[#FF5000] py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] sm:flex-1"
          >
            Siparişimi Takip Et
          </Link>
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-xl border border-gray-300 py-3 text-sm font-bold text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] sm:flex-1"
          >
            Alışverişe Dön
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessContent />
    </Suspense>
  );
}
