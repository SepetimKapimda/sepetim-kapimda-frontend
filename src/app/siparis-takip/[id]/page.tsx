"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bike, Check, Clock, Loader2, Star, XCircle } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { useToastStore } from "@/store/useToastStore";
import {
  cancelOrder,
  fetchOrder,
  type OrderDetail,
  type OrderItemDetail,
  type OrderStatus,
} from "@/lib/api/orders";
import { createComment } from "@/lib/api/comments";

// Canlı `OrderStatusEnum` (RECEIVED → PREPARING → WAITING_COURIER →
// HANDED_TO_COURIER → ON_THE_WAY → DELIVERED, ayrıca CANCELED) sırasıyla
// birebir eşleşir; "Kurye Bekleniyor" kendi adımı olarak gösterilir.
const ORDER_STEPS: { key: Exclude<OrderStatus, "CANCELED">; label: string }[] = [
  { key: "RECEIVED", label: "Alındı" },
  { key: "PREPARING", label: "Hazırlanıyor" },
  { key: "WAITING_COURIER", label: "Kurye Bekleniyor" },
  { key: "HANDED_TO_COURIER", label: "Kuryede" },
  { key: "ON_THE_WAY", label: "Yolda" },
  { key: "DELIVERED", label: "Teslim Edildi" },
];

// Müşteri siparişini sadece "Sipariş Alındı" (RECEIVED) durumundayken iptal edebilir.
const CANCELABLE_STATUSES: OrderStatus[] = ["RECEIVED"];

const POLL_INTERVAL_MS = 15000;
const REVIEW_COMMENT_MAX_LENGTH = 200;

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const orderId = Number(params.id);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const [reviewModalItem, setReviewModalItem] = useState<OrderItemDetail | null>(null);
  const [modalRating, setModalRating] = useState(0);
  const [modalComment, setModalComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(orderId)) {
      setIsLoading(false);
      setLoadError("Geçersiz sipariş numarası.");
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        const data = await fetchOrder(orderId);
        if (!isMounted) return;
        setOrder(data);
        setLoadError(null);
        if (data.status === "DELIVERED" || data.status === "CANCELED") {
          clearInterval(intervalId);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof ApiError ? error.message : "Sipariş bulunamadı.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const intervalId = setInterval(load, POLL_INTERVAL_MS);
    load();

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [orderId]);

  const openReviewModal = (item: OrderItemDetail) => {
    setModalRating(0);
    setModalComment("");
    setReviewModalItem(item);
  };

  const closeReviewModal = () => setReviewModalItem(null);

  const handleConfirmCancel = async () => {
    if (!order) return;
    setIsCanceling(true);
    try {
      await cancelOrder(order.id);
      setOrder((prev) =>
        prev ? { ...prev, status: "CANCELED", canceled_at: new Date().toISOString() } : prev
      );
      setIsCancelModalOpen(false);
      useToastStore.getState().showToast("success", "Siparişiniz iptal edildi.");
    } catch (error) {
      useToastStore
        .getState()
        .showToast("error", error instanceof ApiError ? error.message : "Sipariş iptal edilemedi.");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModalItem || modalRating === 0) return;
    setIsSubmittingReview(true);
    try {
      const review = await createComment({
        orderItemId: reviewModalItem.id,
        rating: modalRating,
        comment: modalComment.trim() || undefined,
      });
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === reviewModalItem.id ? { ...item, review_id: review.id } : item
              ),
            }
          : prev
      );
      useToastStore.getState().showToast("success", "Değerlendirmeniz için teşekkürler!");
      setReviewModalItem(null);
    } catch (error) {
      useToastStore
        .getState()
        .showToast(
          "error",
          error instanceof ApiError ? error.message : "Değerlendirme gönderilemedi."
        );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h1 className="font-heading text-xl font-bold text-charcoal">Sipariş bulunamadı</h1>
        <p className="text-sm text-muted">{loadError ?? "Bu sipariş görüntülenemiyor."}</p>
      </div>
    );
  }

  const currentStepIndex = ORDER_STEPS.findIndex((step) => step.key === order.status);
  const canCancel = CANCELABLE_STATUSES.includes(order.status);
  const isCanceled = order.status === "CANCELED";
  const isDelivered = order.status === "DELIVERED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Üst bilgi kartı */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
        <h1 className="font-heading text-xl font-bold text-charcoal sm:text-2xl">
          Sipariş Detayı (#{order.id})
        </h1>
        {isCanceled ? (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-600">
            <XCircle className="h-4 w-4" />
            Bu sipariş iptal edildi
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <Clock className="h-4 w-4" />
            {isDelivered ? "Teslim edildi" : `Tahmini Varış: ${order.eta_minutes} Dk`}
          </div>
        )}
      </div>

      {isCanceled ? (
        /* İptal edilmiş sipariş kartı — stepper yerine gösterilir */
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-5 shadow-soft sm:p-6">
          <XCircle className="h-8 w-8 shrink-0 text-red-500" />
          <div>
            <p className="font-heading text-base font-bold text-red-700">
              Sipariş İptal Edildi
            </p>
            <p className="mt-1 text-sm text-red-600">
              Bu sipariş talebiniz üzerine iptal edilmiştir. Ödeme yaptıysanız iade süreci en
              kısa sürede başlatılacaktır.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Durum çubuğu (stepper) */}
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-8">
            <div className="flex min-w-[520px] items-start sm:min-w-0">
              {ORDER_STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isReached = index <= currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      <div
                        className={`h-0.5 flex-1 ${
                          index === 0
                            ? "invisible"
                            : isReached
                              ? "bg-[#FF5000]"
                              : "bg-gray-200"
                        }`}
                      />
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                          isReached
                            ? "border-[#FF5000] bg-[#FF5000] text-white"
                            : "border-gray-300 bg-white text-gray-400"
                        }`}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div
                        className={`h-0.5 flex-1 ${
                          index === ORDER_STEPS.length - 1
                            ? "invisible"
                            : isCompleted
                              ? "bg-[#FF5000]"
                              : "bg-gray-200"
                        }`}
                      />
                    </div>
                    <span
                      className={`mt-2 text-center text-[11px] font-semibold sm:text-sm ${
                        isReached ? "text-charcoal" : "text-muted"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kurye bilgi kartı */}
          {order.assigned_courier && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-soft sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bike className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm font-semibold text-charcoal">
                Kurye: {order.assigned_courier} siparişini getiriyor
              </p>
            </div>
          )}
        </>
      )}

      {/* Sipariş özeti */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="font-heading text-lg font-bold text-charcoal">Sipariş Özeti</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {order.items.map((item) => {
            const isReviewed = item.review_id !== null;
            return (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-charcoal">
                  <span className="font-semibold">{item.quantity}x</span> {item.product.name}
                </span>
                <span className="shrink-0 font-bold text-charcoal">
                  {formatCurrency(Number(item.selling_price) * item.quantity)}
                </span>
                {isDelivered && (
                  <button
                    type="button"
                    onClick={() => !isReviewed && openReviewModal(item)}
                    disabled={isReviewed}
                    aria-label={
                      isReviewed
                        ? `${item.product.name} değerlendirildi`
                        : `${item.product.name} ürününü değerlendir`
                    }
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 ${
                      isReviewed
                        ? "cursor-default bg-green-50 text-green-600"
                        : "border border-gray-200 text-muted hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${isReviewed ? "fill-green-600" : ""}`} />
                    <span className="hidden sm:inline">
                      {isReviewed ? "Değerlendirildi" : "Değerlendir"}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm">
          <div className="flex items-center justify-between text-muted">
            <span>Ödeme Yöntemi</span>
            <span className="font-semibold text-charcoal">{order.payment_method_display}</span>
          </div>
          <div className="flex items-center justify-between text-muted">
            <span>Teslimat Mesafesi</span>
            <span className="font-semibold text-charcoal">
              {Number(order.distance_km).toFixed(1)} km
            </span>
          </div>
          <div className="flex items-center justify-between text-muted">
            <span>Teslimat Ücreti</span>
            <span className="font-semibold text-charcoal">
              {formatCurrency(order.customer_courier_fee)}
            </span>
          </div>
          {Number(order.coupon_discount) > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <span>Kupon İndirimi</span>
              <span className="font-semibold">-{formatCurrency(order.coupon_discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-base">
            <span className="font-bold text-charcoal">Genel Toplam</span>
            <span className="font-extrabold text-primary">{formatCurrency(order.order_total)}</span>
          </div>
        </div>
      </div>

      {/* Siparişi İptal Et — sadece "Sipariş Alındı" aşamasında görünür */}
      {canCancel && (
        <button
          type="button"
          onClick={() => setIsCancelModalOpen(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3.5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 active:scale-[0.98]"
        >
          <XCircle className="h-4 w-4" />
          Siparişi İptal Et
        </button>
      )}

      {/* Onay modalı */}
      {isCancelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Siparişi İptal Et"
          onClick={() => !isCanceling && setIsCancelModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center font-heading text-lg font-bold text-charcoal">
              Siparişi iptal etmek istediğine emin misin?
            </h3>
            <p className="mt-2 text-center text-sm text-muted">
              Bu işlem geri alınamaz. Market bilgilendirilecek ve ödeme yaptıysan iade süreci
              başlatılacaktır.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCanceling}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCanceling}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCanceling && <Loader2 className="h-4 w-4 animate-spin" />}
                Evet, İptal Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ürün Değerlendirme modalı */}
      {reviewModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ürünü Değerlendir"
          onClick={closeReviewModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover"
          >
            <h3 className="text-center font-heading text-lg font-bold text-charcoal">
              {reviewModalItem.product.name}
            </h3>
            <p className="mt-1 text-center text-sm text-muted">Ürünü nasıl buldunuz?</p>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setModalRating(star)}
                  aria-label={`${star} yıldız ver`}
                  aria-pressed={star <= modalRating}
                  className="p-1 transition active:scale-90"
                >
                  <Star
                    className={`h-8 w-8 transition ${
                      star <= modalRating ? "fill-secondary text-secondary" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            <label className="mt-5 flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-charcoal">Yorumunuz</span>
              <textarea
                rows={4}
                maxLength={REVIEW_COMMENT_MAX_LENGTH}
                value={modalComment}
                onChange={(e) => setModalComment(e.target.value)}
                placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
                className="resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              <span className="self-end text-xs text-muted">
                {modalComment.length}/{REVIEW_COMMENT_MAX_LENGTH}
              </span>
            </label>

            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={isSubmittingReview}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={modalRating === 0 || isSubmittingReview}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FF5000] py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
