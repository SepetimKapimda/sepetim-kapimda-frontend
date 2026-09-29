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
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchCourierBankInfo,
  fetchCourierPayoutHistory,
  requestCourierPayout,
} from "@/lib/api/courier";
import type { BankInfo, PayoutRequestItem, Wallet as WalletSummary } from "@/lib/api/payoutTypes";

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

export default function CourierCuzdanPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    fetchCourierBankInfo()
      .then(setBankInfo)
      .catch((error) => showError(error, "Banka bilgisi alınamadı."));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchCourierPayoutHistory(1)
      .then((data) => {
        setWallet(data.wallet);
        setPayouts(data.results);
      })
      .catch((error) => showError(error, "Hakediş geçmişi alınamadı."))
      .finally(() => setIsLoading(false));
  }, []);

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
      const data = await requestCourierPayout(amount, requestNotes.trim() || undefined);
      setWallet(data.wallet);
      setPayouts((prev) => [data.payout, ...prev]);
      setIsRequestModalOpen(false);
      useToastStore.getState().showToast("success", "Hakediş talebiniz oluşturuldu.");
    } catch (error) {
      showError(error, "Hakediş talebi oluşturulamadı.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pb-10 pt-6 sm:px-6">
      <h1 className="mb-5 font-heading text-2xl font-black text-gray-900">Cüzdan &amp; Ödemeler</h1>

      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
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
            href="/kurye/ayarlar"
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
          >
            Önce banka bilgilerini ekle
          </Link>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Landmark className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium text-muted">Banka (IBAN) Bilgilerim</p>
        {hasBankInfo ? (
          <>
            <p className="mt-1 font-mono text-base font-black text-charcoal">{bankInfo?.iban}</p>
            <p className="mt-2 text-xs text-muted">{bankInfo?.iban_account_holder}</p>
          </>
        ) : (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Henüz banka bilgisi girilmedi.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-charcoal">Hakediş Talep Geçmişi</h2>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-card">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-muted">
            Henüz bir hakediş talebiniz yok.
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
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
                <p className="mb-1 font-heading text-lg font-black text-charcoal">
                  {formatCurrency(payout.amount)}
                </p>
                {payout.status === "APPROVED" && payout.receipt_url && (
                  <a
                    href={payout.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Dekontu Gör
                  </a>
                )}
                {payout.status === "REJECTED" && payout.processor_note && (
                  <p className="text-xs text-muted">{payout.processor_note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
