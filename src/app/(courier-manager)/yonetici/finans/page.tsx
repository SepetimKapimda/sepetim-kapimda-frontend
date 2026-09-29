"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Landmark,
  Loader2,
  PiggyBank,
  Receipt,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { useToastStore } from "@/store/useToastStore";
import type {
  BankInfo,
  PayoutRequestItem,
  ProcessorPayoutRequest,
  Wallet as WalletSummary,
} from "@/lib/api/payoutTypes";
import {
  approveManagerCourierPayout,
  fetchManagerBankInfo,
  fetchManagerCourierPayouts,
  fetchManagerPayoutHistory,
  rejectManagerCourierPayout,
  requestManagerPayout,
} from "@/lib/api/managerCouriers";

type FinansTab = "incoming" | "outgoing";
type OutgoingStatusFilter = "PENDING" | "APPROVED" | "REJECTED";

const payoutStatusBadgeClasses: Record<PayoutRequestItem["status"], string> = {
  PENDING: "bg-secondary/20 text-secondary-800",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

export default function CourierManagerFinansPage() {
  const [activeTab, setActiveTab] = useState<FinansTab>("incoming");

  // --- Platformdan gelen (kendi hakedişim) ---
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [incomingPayouts, setIncomingPayouts] = useState<PayoutRequestItem[]>([]);
  const [isLoadingIncoming, setIsLoadingIncoming] = useState(true);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // --- Kurye hakedişleri (giden, onaylanacak) ---
  const [outgoingStatus, setOutgoingStatus] = useState<OutgoingStatusFilter>("PENDING");
  const [courierPayouts, setCourierPayouts] = useState<ProcessorPayoutRequest[]>([]);
  const [isLoadingOutgoing, setIsLoadingOutgoing] = useState(true);
  const [processingPayout, setProcessingPayout] = useState<{
    payout: ProcessorPayoutRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [processNote, setProcessNote] = useState("");
  const [processReceiptUrl, setProcessReceiptUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchManagerBankInfo()
      .then(setBankInfo)
      .catch((error) => showError(error, "Banka bilgisi alınamadı."));
  }, []);

  useEffect(() => {
    setIsLoadingIncoming(true);
    fetchManagerPayoutHistory(1)
      .then((data) => {
        setWallet(data.wallet);
        setIncomingPayouts(data.results);
      })
      .catch((error) => showError(error, "Hakediş geçmişi alınamadı."))
      .finally(() => setIsLoadingIncoming(false));
  }, []);

  useEffect(() => {
    setIsLoadingOutgoing(true);
    fetchManagerCourierPayouts({ status: outgoingStatus })
      .then((data) => setCourierPayouts(data.results))
      .catch((error) => showError(error, "Kurye hakediş talepleri alınamadı."))
      .finally(() => setIsLoadingOutgoing(false));
  }, [outgoingStatus]);

  const hasBankInfo = Boolean(bankInfo?.iban);
  const availableBalance = wallet ? Number(wallet.available_balance) : 0;

  const openRequestModal = () => {
    setRequestAmount(wallet ? wallet.available_balance : "");
    setRequestNotes("");
    setIsRequestModalOpen(true);
  };

  const handleSubmitPayoutRequest = async (e: FormEvent) => {
    e.preventDefault();
    const amount = requestAmount.trim();
    if (!amount || Number(amount) <= 0) return;

    setIsSubmittingRequest(true);
    try {
      const data = await requestManagerPayout(amount, requestNotes.trim() || undefined);
      setWallet(data.wallet);
      setIncomingPayouts((prev) => [data.payout, ...prev]);
      setIsRequestModalOpen(false);
      useToastStore.getState().showToast("success", "Hakediş talebiniz oluşturuldu.");
    } catch (error) {
      showError(error, "Hakediş talebi oluşturulamadı.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const openProcessModal = (payout: ProcessorPayoutRequest, action: "approve" | "reject") => {
    setProcessingPayout({ payout, action });
    setProcessNote("");
    setProcessReceiptUrl("");
  };

  const closeProcessModal = () => setProcessingPayout(null);

  const handleConfirmProcess = async () => {
    if (!processingPayout) return;
    setIsProcessing(true);
    try {
      const { payout, action } = processingPayout;
      if (action === "approve") {
        await approveManagerCourierPayout(payout.id, {
          receipt_url: processReceiptUrl.trim() || undefined,
          note: processNote.trim() || undefined,
        });
        useToastStore.getState().showToast("success", "Talep onaylandı.");
      } else {
        await rejectManagerCourierPayout(payout.id, { note: processNote.trim() || undefined });
        useToastStore.getState().showToast("success", "Talep reddedildi.");
      }
      setCourierPayouts((prev) => prev.filter((p) => p.id !== payout.id));
      closeProcessModal();
    } catch (error) {
      showError(error, "İşlem gerçekleştirilemedi.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-black text-gray-900">Finans &amp; Ödenekler</h1>

      <div className="mb-6 flex items-center gap-1.5 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("incoming")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "incoming" ? "border-primary text-primary" : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Platformdan Gelen (Benim Hakedişim)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("outgoing")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "outgoing" ? "border-primary text-primary" : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Kurye Hakedişleri (Giden)
        </button>
      </div>

      {activeTab === "incoming" && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Wallet className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-muted">Güncel Hakediş Bakiyeniz</p>
              <p className="mt-1 font-heading text-3xl font-black text-charcoal">
                {wallet ? formatCurrency(wallet.balance) : "..."}
              </p>
              <p className="mt-2 text-xs text-muted">
                Çekilebilir: <span className="font-bold text-charcoal">{wallet ? formatCurrency(wallet.available_balance) : "..."}</span>
                {" · "}Onay bekleyen: {wallet ? formatCurrency(wallet.pending_total) : "..."}
              </p>

              {hasBankInfo ? (
                <button
                  type="button"
                  onClick={openRequestModal}
                  disabled={availableBalance <= 0}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PiggyBank className="h-4 w-4" />
                  Para Çek / Talep Et
                </button>
              ) : (
                <Link
                  href="/yonetici/hesabim"
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
                >
                  Önce banka bilgilerini ekle
                </Link>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Landmark className="h-5 w-5" />
                </div>
                <Link
                  href="/yonetici/hesabim"
                  className="flex items-center gap-1 text-xs font-bold text-orange-600 transition hover:text-orange-700"
                >
                  Düzenle
                </Link>
              </div>
              <p className="text-xs font-medium text-muted">Banka (IBAN) Bilgilerim</p>
              {hasBankInfo ? (
                <>
                  <p className="mt-1 font-mono text-lg font-black text-charcoal">{bankInfo?.iban}</p>
                  <p className="mt-2 text-xs text-muted">{bankInfo?.iban_account_holder}</p>
                </>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Henüz banka bilgisi girilmedi.
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
              <Receipt className="h-5 w-5 text-orange-500" />
              Hakediş Talep Geçmişi
            </h2>

            {isLoadingIncoming ? (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-card">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : incomingPayouts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-muted">
                Henüz bir hakediş talebiniz yok.
              </div>
            ) : (
              <div className="space-y-3">
                {incomingPayouts.map((payout) => (
                  <div key={payout.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-heading text-sm font-bold text-charcoal">
                        {formatDateTime(payout.requested_at)}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${payoutStatusBadgeClasses[payout.status]}`}
                      >
                        {payout.status === "APPROVED" && <CheckCircle2 className="h-3 w-3" />}
                        {payout.status === "PENDING" && <Clock className="h-3 w-3" />}
                        {payout.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                        {payout.status_display}
                      </span>
                    </div>
                    <p className="font-heading text-lg font-black text-charcoal">{formatCurrency(payout.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "outgoing" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {(["PENDING", "APPROVED", "REJECTED"] as OutgoingStatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setOutgoingStatus(status)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  outgoingStatus === status ? "bg-primary text-white" : "bg-gray-100 text-muted hover:bg-gray-200"
                }`}
              >
                {status === "PENDING" ? "Onay Bekleyen" : status === "APPROVED" ? "Onaylanan" : "Reddedilen"}
              </button>
            ))}
          </div>

          {isLoadingOutgoing ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-card">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : courierPayouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-muted">
              Bu durumda kurye hakediş talebi yok.
            </div>
          ) : (
            <div className="space-y-3">
              {courierPayouts.map((payout) => (
                <div key={payout.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-heading text-sm font-bold text-charcoal">{payout.requester.full_name}</p>
                      <p className="text-xs text-muted">{formatDateTime(payout.requested_at)}</p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${payoutStatusBadgeClasses[payout.status]}`}
                    >
                      {payout.status_display}
                    </span>
                  </div>
                  <p className="mb-1 font-heading text-lg font-black text-charcoal">{formatCurrency(payout.amount)}</p>
                  <p className="mb-3 font-mono text-xs text-muted">{payout.iban} · {payout.account_holder_name}</p>
                  {payout.notes && <p className="mb-3 text-xs text-muted">Not: {payout.notes}</p>}

                  {payout.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openProcessModal(payout, "reject")}
                        className="flex-1 rounded-lg border border-red-200 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-95"
                      >
                        Reddet
                      </button>
                      <button
                        type="button"
                        onClick={() => openProcessModal(payout, "approve")}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 active:scale-95"
                      >
                        Onayla
                      </button>
                    </div>
                  )}
                  {payout.status === "REJECTED" && payout.processor_note && (
                    <p className="text-xs text-muted">Red gerekçesi: {payout.processor_note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isRequestModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hakediş Talep Et"
          onClick={() => !isSubmittingRequest && setIsRequestModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h3 className="font-heading text-lg font-bold text-charcoal">Para Çek / Talep Et</h3>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitPayoutRequest} className="space-y-4 px-5 py-5">
              <div>
                <label htmlFor="payout-amount" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Tutar (₺)
                </label>
                <input
                  id="payout-amount"
                  type="number"
                  required
                  min={0.01}
                  max={availableBalance || undefined}
                  step="0.01"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-1 text-xs text-muted">Çekilebilir tutar: {formatCurrency(availableBalance)}</p>
              </div>
              <div>
                <label htmlFor="payout-notes" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Not (opsiyonel)
                </label>
                <textarea
                  id="payout-notes"
                  rows={3}
                  maxLength={1000}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingRequest}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingRequest && <Loader2 className="h-4 w-4 animate-spin" />}
                Talebi Gönder
              </button>
            </form>
          </div>
        </div>
      )}

      {processingPayout && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={processingPayout.action === "approve" ? "Talebi Onayla" : "Talebi Reddet"}
          onClick={() => !isProcessing && closeProcessModal()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h3 className="font-heading text-lg font-bold text-charcoal">
                {processingPayout.action === "approve" ? "Talebi Onayla" : "Talebi Reddet"}
              </h3>
              <button
                type="button"
                onClick={closeProcessModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-muted">
                  {processingPayout.payout.requester.full_name} — Talep Tutarı
                </p>
                <p className="font-heading text-2xl font-black text-charcoal">
                  {formatCurrency(processingPayout.payout.amount)}
                </p>
              </div>

              {processingPayout.action === "approve" && (
                <div>
                  <label htmlFor="process-receipt" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Dekont Linki (opsiyonel)
                  </label>
                  <input
                    id="process-receipt"
                    type="url"
                    value={processReceiptUrl}
                    onChange={(e) => setProcessReceiptUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              <div>
                <label htmlFor="process-note" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Not {processingPayout.action === "reject" && "(gerekçe)"}
                </label>
                <textarea
                  id="process-note"
                  rows={3}
                  value={processNote}
                  onChange={(e) => setProcessNote(e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmProcess}
                disabled={isProcessing}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-soft transition focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                  processingPayout.action === "approve"
                    ? "bg-green-600 hover:bg-green-700 focus-visible:ring-green-500/40"
                    : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-400/40"
                }`}
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {processingPayout.action === "approve" ? "Onayla" : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
