"use client";

import { Suspense, useState, type FormEvent } from "react";
import useSWR from "swr";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
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
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/format";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchMarketBankInfo,
  fetchMarketPayoutHistory,
  requestMarketPayout,
  type PayoutRequestItem,
} from "@/lib/api/vendorPayouts";
import { fetchMarketFinanceSummary } from "@/lib/api/vendorFinance";

const PAYOUT_PAGE_SIZE = 20;

type Period = "daily" | "weekly" | "monthly";
type FinansTab = "sales" | "balance";

const periodLabels: Record<Period, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
};

const GROSS_COLOR = "#F97316";

const payoutStatusBadgeClasses: Record<PayoutRequestItem["status"], string> = {
  PENDING: "bg-secondary/20 text-secondary-800",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

function VendorFinansContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<FinansTab>("sales");
  const [payoutsPage, setPayoutsPage] = useState(1);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde banka bilgisi/hakediş
  // geçmişi anında gösterilir, arka planda tazelenir.
  const { data: bankInfo } = useSWR("vendor-bank-info", fetchMarketBankInfo, {
    onError: (error) => showError(error, "Banka bilgisi alınamadı."),
  });

  const {
    data: payoutData,
    isLoading: isLoadingPayouts,
    mutate: mutatePayouts,
  } = useSWR(
    ["vendor-payout-history", payoutsPage],
    ([, page]: [string, number]) => fetchMarketPayoutHistory(page),
    { onError: (error) => showError(error, "Hakediş geçmişi alınamadı.") }
  );
  const wallet = payoutData?.wallet ?? null;
  const payouts = payoutData?.results ?? [];
  const payoutsCount = payoutData?.count ?? 0;

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
      const data = await requestMarketPayout(amount, requestNotes.trim() || undefined);
      mutatePayouts(
        (current) =>
          current && {
            ...current,
            wallet: data.wallet,
            results: [data.payout, ...current.results],
            count: current.count + 1,
          },
        { revalidate: false }
      );
      setIsRequestModalOpen(false);
      useToastStore.getState().showToast("success", "Hakediş talebiniz oluşturuldu.");
    } catch (error) {
      showError(error, "Hakediş talebi oluşturulamadı.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const period = (searchParams.get("period") as Period) || "daily";
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const isCustomActive = Boolean(startParam && endParam);

  const [draftStart, setDraftStart] = useState(startParam || "");
  const [draftEnd, setDraftEnd] = useState(endParam || "");

  const { data: summary, isLoading: isLoadingSummary } = useSWR(
    ["vendor-finance-summary", period, isCustomActive, startParam, endParam],
    ([, filterPeriod, customActive, start, end]: [
      string,
      Period,
      boolean,
      string | null,
      string | null,
    ]) =>
      fetchMarketFinanceSummary(
        customActive ? { startDate: start!, endDate: end! } : { filter: filterPeriod }
      ),
    { onError: (error) => showError(error, "Finans özeti alınamadı.") }
  );

  const handlePeriodClick = (value: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "daily") {
      params.delete("period");
    } else {
      params.set("period", value);
    }
    params.delete("start");
    params.delete("end");
    setDraftStart("");
    setDraftEnd("");
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleApplyCustomRange = () => {
    if (!draftStart || !draftEnd) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", draftStart);
    params.set("end", draftEnd);
    params.delete("period");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const rechartsData = (summary?.points ?? []).map((point) => ({
    label: point.label,
    "Toplam Ürün Geliri": point.gross_sales,
  }));

  const totalGross = summary ? Number(summary.total_gross_sales) : 0;
  const totalCouponDiscount = summary ? Number(summary.total_coupon_discount) : 0;
  // Kupon uygulanan siparişlerde net hakediş (earnings = gross_sales - coupon_discount)
  // brüt satıştan farklı olabilir; kupon indirimini market karşılar.
  const totalEarnings = summary ? Number(summary.total_earnings) : 0;

  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-black text-gray-900">Finans & Hakediş</h1>

      <div className="mb-6 flex items-center gap-1.5 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("sales")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "sales"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Satış &amp; Analiz
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("balance")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "balance"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Cari Bakiye &amp; Ödemeler
        </button>
      </div>

      {activeTab === "sales" && (
        <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="finans-start-date" className="text-xs font-bold text-muted">
                Başlangıç
              </label>
              <input
                id="finans-start-date"
                type="date"
                value={draftStart}
                max={draftEnd || undefined}
                onChange={(e) => setDraftStart(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="finans-end-date" className="text-xs font-bold text-muted">
                Bitiş
              </label>
              <input
                id="finans-end-date"
                type="date"
                value={draftEnd}
                min={draftStart || undefined}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCustomRange}
              disabled={!draftStart || !draftEnd}
              className="rounded-lg bg-charcoal px-3 py-1.5 text-xs font-bold text-white shadow-soft transition hover:bg-charcoal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Uygula
            </button>
          </div>

          <div className="flex flex-wrap gap-1 rounded-full bg-gray-100 p-1">
            {(Object.keys(periodLabels) as Period[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePeriodClick(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  !isCustomActive && period === value
                    ? "bg-orange-500 text-white shadow-soft"
                    : "text-muted hover:text-charcoal"
                }`}
              >
                {periodLabels[value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-card sm:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
          <PiggyBank className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-muted">
          Net Hakediş{" "}
          <span className="text-muted/70">
            (Belirlediğiniz ürün fiyatları toplamından kupon indirimi düşülerek hesabınıza
            yatırılacak tutar)
          </span>
        </p>
        <p className="mt-1 font-heading text-4xl font-black text-green-600">
          {formatCurrency(totalEarnings)}
        </p>
        {totalCouponDiscount > 0 && (
          <p className="mt-2 text-xs text-muted">
            Brüt satış: <span className="font-bold">{formatCurrency(totalGross)}</span> · Kupon
            indirimi: <span className="font-bold text-red-600">-{formatCurrency(totalCouponDiscount)}</span>
          </p>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-card md:p-6">
        <h2 className="mb-6 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          Satış Trendi
          {isCustomActive && (
            <span className="text-sm font-medium text-muted">
              ({startParam} - {endParam})
            </span>
          )}
        </h2>

        {isLoadingSummary ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-gray-200">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : rechartsData.length === 0 ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-muted">
            Seçilen aralıkta veri bulunmuyor.
          </div>
        ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rechartsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GROSS_COLOR} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={GROSS_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#E5E7EB" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
                }
              />
              <Tooltip
                formatter={(value) => `${Number(value).toLocaleString("tr-TR")} ₺`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 8px 24px -4px rgba(17,24,39,0.12)",
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="Toplam Ürün Geliri"
                stroke={GROSS_COLOR}
                fill="url(#grossGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>
        </>
      )}

      {activeTab === "balance" && (
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
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PiggyBank className="h-4 w-4" />
              Para Çek / Talep Et
            </button>
          ) : (
            <Link
              href="/vendor/ayarlar?tab=account"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-orange-300 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
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
              href="/vendor/ayarlar?tab=account"
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

        {isLoadingPayouts ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-card">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-muted">
            Henüz bir hakediş talebiniz yok.
          </div>
        ) : (
          <>
        {/* Masaüstü: Veri Tablosu */}
        <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Not</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-charcoal">{formatDateTime(payout.requested_at)}</td>
                  <td className="px-4 py-3 font-bold text-charcoal">{formatCurrency(payout.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${payoutStatusBadgeClasses[payout.status]}`}
                    >
                      {payout.status === "APPROVED" && <CheckCircle2 className="h-3 w-3" />}
                      {payout.status === "PENDING" && <Clock className="h-3 w-3" />}
                      {payout.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                      {payout.status_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {payout.status === "APPROVED" && payout.receipt_url && (
                      <a
                        href={payout.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-orange-600 hover:underline"
                      >
                        Dekontu Gör
                      </a>
                    )}
                    {payout.status === "REJECTED" && payout.processor_note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobil: Kompakt Kartlar */}
        <div className="space-y-3 md:hidden">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card"
            >
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
                  className="text-xs font-bold text-orange-600 hover:underline"
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

        <Pagination
          currentPage={payoutsPage}
          totalPages={getTotalPages(payoutsCount, PAYOUT_PAGE_SIZE)}
          onPageChange={setPayoutsPage}
          className="mt-6"
        />
          </>
        )}
      </div>
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
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <p className="mt-1 text-xs text-muted">
                  Çekilebilir tutar: {formatCurrency(availableBalance)}
                </p>
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
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingRequest}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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

export default function VendorFinansPage() {
  return (
    <Suspense fallback={null}>
      <VendorFinansContent />
    </Suspense>
  );
}
