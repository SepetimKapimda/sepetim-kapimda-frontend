"use client";

import { useEffect, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Check, CheckCircle2, Clock, Landmark, Loader2, X, XCircle } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/format";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import {
  approveAdminPayout,
  fetchAdminPayouts,
  rejectAdminPayout,
  type PayoutRecipientType,
} from "@/lib/api/adminPayouts";
import type { PayoutStatus, ProcessorPayoutRequest } from "@/lib/api/payoutTypes";

const PAGE_SIZE = 15;

const statusBadgeClasses: Record<PayoutStatus, string> = {
  PENDING: "bg-secondary/20 text-secondary-800",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const statusFilterOptions: { value: PayoutStatus; label: string }[] = [
  { value: "PENDING", label: "Onay Bekliyor" },
  { value: "APPROVED", label: "Onaylandı" },
  { value: "REJECTED", label: "Reddedildi" },
];

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
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

export default function AdminFinansPage() {
  const [recipientType, setRecipientType] = useState<PayoutRecipientType>("market");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>("PENDING");
  const [page, setPage] = useState(1);

  const [processingPayout, setProcessingPayout] = useState<{
    payout: ProcessorPayoutRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [recipientType, statusFilter]);

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde önceki hakediş listesi
  // anında gösterilir, arka planda tazelenir.
  const { data, isLoading, mutate } = useSWR(
    ["admin-payouts", recipientType, statusFilter, page],
    ([, type, status, pageValue]: [string, PayoutRecipientType, PayoutStatus, number]) =>
      fetchAdminPayouts({ recipientType: type, status, page: pageValue, pageSize: PAGE_SIZE }),
    { onError: (error) => showError(error, "Hakediş talepleri alınamadı.") }
  );
  const payouts = data?.results ?? [];
  const count = data?.count ?? 0;

  const openProcessModal = (payout: ProcessorPayoutRequest, action: "approve" | "reject") => {
    setProcessingPayout({ payout, action });
    setReceiptUrl("");
    setNote("");
  };

  const closeProcessModal = () => setProcessingPayout(null);

  const handleSubmitProcess = async (e: FormEvent) => {
    e.preventDefault();
    if (!processingPayout) return;
    setIsProcessing(true);
    try {
      const payload = {
        ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
        ...(note ? { note } : {}),
      };
      if (processingPayout.action === "approve") {
        await approveAdminPayout(processingPayout.payout.id, payload);
        useToastStore.getState().showToast("success", "Hakediş talebi onaylandı.");
      } else {
        await rejectAdminPayout(processingPayout.payout.id, payload);
        useToastStore.getState().showToast("success", "Hakediş talebi reddedildi.");
      }
      setProcessingPayout(null);
      mutate();
    } catch (error) {
      showError(error, "İşlem gerçekleştirilemedi.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Sistem Finansı</h1>

      <div className="mb-4 flex items-center gap-1.5 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setRecipientType("market")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            recipientType === "market"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Market Hakedişleri
        </button>
        <button
          type="button"
          onClick={() => setRecipientType("manager")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            recipientType === "manager"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Kurye Yöneticisi Hakedişleri
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {statusFilterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
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

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-muted">
          Bu filtrelere uygun hakediş talebi yok.
        </div>
      ) : (
        <>
          {/* Masaüstü: Veri Tablosu */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Talep Eden</th>
                  <th className="px-4 py-3">IBAN</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Talep Tarihi</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-bold text-charcoal">{payout.requester.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{payout.iban}</td>
                    <td className="px-4 py-3 font-heading text-base font-black text-charcoal">
                      {formatCurrency(payout.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(payout.requested_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClasses[payout.status]}`}
                      >
                        {payout.status === "PENDING" && <Clock className="h-3 w-3" />}
                        {payout.status === "APPROVED" && <CheckCircle2 className="h-3 w-3" />}
                        {payout.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                        {payout.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {payout.status === "PENDING" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openProcessModal(payout, "approve")}
                            className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-soft transition hover:bg-green-700 active:scale-95"
                          >
                            Onayla
                          </button>
                          <button
                            type="button"
                            onClick={() => openProcessModal(payout, "reject")}
                            className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 active:scale-95"
                          >
                            Reddet
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">{payout.processor_note || "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil: Kompakt Kartlar */}
          <div className="space-y-3 md:hidden">
            {payouts.map((payout) => (
              <div key={payout.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-sm font-bold text-charcoal">{payout.requester.full_name}</p>
                    <p className="text-xs text-muted">{formatDateTime(payout.requested_at)}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClasses[payout.status]}`}
                  >
                    {payout.status_display}
                  </span>
                </div>
                <div className="mb-3 flex items-center gap-1.5 text-xs text-muted">
                  <Landmark className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-mono">{payout.iban}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                  <span className="font-heading text-lg font-black text-charcoal">
                    {formatCurrency(payout.amount)}
                  </span>
                  {payout.status === "PENDING" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openProcessModal(payout, "approve")}
                        className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-soft active:scale-95"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => openProcessModal(payout, "reject")}
                        className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 active:scale-95"
                      >
                        Reddet
                      </button>
                    </div>
                  )}
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

      {processingPayout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeProcessModal}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                {processingPayout.action === "approve" ? "Hakedişi Onayla" : "Hakedişi Reddet"}
              </h2>
              <button
                type="button"
                onClick={closeProcessModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProcess} className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-muted">
                  {processingPayout.payout.requester.full_name} - Talep Tutarı
                </p>
                <p className="font-heading text-2xl font-black text-charcoal">
                  {formatCurrency(processingPayout.payout.amount)}
                </p>
              </div>

              {processingPayout.action === "approve" && (
                <div>
                  <label htmlFor="receipt-url" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Dekont Linki (Opsiyonel)
                  </label>
                  <input
                    id="receipt-url"
                    type="url"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              )}

              <div>
                <label htmlFor="process-note" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Not (Opsiyonel)
                </label>
                <textarea
                  id="process-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-soft transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
                  processingPayout.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : processingPayout.action === "approve" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {processingPayout.action === "approve" ? "Onayla" : "Reddet"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
