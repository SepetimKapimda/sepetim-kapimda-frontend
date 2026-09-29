"use client";

import { useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Percent,
  Send,
  Tag,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  fetchAdminCoupons,
  updateAdminCoupon,
  type AdminCoupon,
} from "@/lib/api/adminCoupons";
import { sendBulkEmail } from "@/lib/api/adminMarketing";
import { fetchAdminSettings, updateAdminSettings } from "@/lib/api/adminSettings";

type MarketingTab = "coupons" | "email" | "resend";
type DiscountType = "percentage" | "fixed";

const PAGE_SIZE = 20;

type ToastState = { type: "success" | "error"; message: string } | null;

const emptyCouponForm = {
  code: "",
  discountType: "percentage" as DiscountType,
  value: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  targetUserId: "",
};

// Yazma tarafında ikisi de opsiyonel — Django Admin'den ayarsız oluşturulmuş
// bir kupon her iki alanı da null bırakabilir, bu yüzden "null ₺" gibi bir
// gösterime düşmemek için üçüncü bir durak eklendi.
function formatCouponDiscount(coupon: AdminCoupon): string {
  if (coupon.discount_percent !== null) return `%${coupon.discount_percent}`;
  if (coupon.discount_amount !== null) return `${coupon.discount_amount} ₺`;
  return "—";
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const turkishMonthsFull = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  return `${date.getDate()} ${turkishMonthsFull[date.getMonth()]} ${date.getFullYear()}`;
}

export default function AdminPazarlamaPage() {
  const [activeTab, setActiveTab] = useState<MarketingTab>("coupons");
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  // --- Kupon Yönetimi ---
  const [couponPage, setCouponPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState(emptyCouponForm);
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde önceki kupon listesi
  // anında gösterilir, arka planda tazelenir.
  const {
    data: couponData,
    isLoading: isLoadingCoupons,
    mutate: mutateCoupons,
  } = useSWR(
    ["admin-coupons", couponPage],
    ([, page]: [string, number]) => fetchAdminCoupons(page, PAGE_SIZE),
    {
      onError: (error) =>
        showToast("error", error instanceof ApiError ? error.message : "Kuponlar alınamadı."),
    }
  );
  const coupons = couponData?.results ?? [];
  const couponCount = couponData?.count ?? 0;

  const openModal = () => {
    setCouponForm(emptyCouponForm);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleAddCoupon = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingCoupon(true);
    try {
      await createAdminCoupon({
        code: couponForm.code.toUpperCase(),
        discount_percent: couponForm.discountType === "percentage" ? Number(couponForm.value) : null,
        discount_amount: couponForm.discountType === "fixed" ? Number(couponForm.value).toFixed(2) : null,
        start_date: `${couponForm.startDate}T00:00:00`,
        end_date: `${couponForm.endDate}T23:59:59`,
        usage_limit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
        user: couponForm.targetUserId ? Number(couponForm.targetUserId) : null,
        active: true,
      });
      showToast("success", `"${couponForm.code.toUpperCase()}" kuponu oluşturuldu.`);
      setIsModalOpen(false);
      mutateCoupons();
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Kupon oluşturulamadı.");
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const handleToggleCouponActive = async (coupon: AdminCoupon) => {
    try {
      const updated = await updateAdminCoupon(coupon.id, { active: !coupon.active });
      // Yerel state'i istemcinin tahmin ettiği tersine çevrilmiş değerle değil,
      // sunucunun onayladığı gerçek değerle güncelle (hızlı art arda tıklamada
      // isteklerin sıraya girmemesi durumunda ekranın gerçek durumdan sapmasını önler).
      mutateCoupons(
        (current) =>
          current && {
            ...current,
            results: current.results.map((c) => (c.id === coupon.id ? { ...c, active: updated.active } : c)),
          },
        { revalidate: false }
      );
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Kupon durumu değiştirilemedi.");
    }
  };

  const handleDeleteCoupon = async (coupon: AdminCoupon) => {
    if (!window.confirm(`"${coupon.code}" kuponu kalıcı olarak silinsin mi?`)) return;
    try {
      await deleteAdminCoupon(coupon.id);
      mutateCoupons(
        (current) => current && { ...current, results: current.results.filter((c) => c.id !== coupon.id) },
        { revalidate: false }
      );
      showToast("success", "Kupon silindi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Kupon silinemedi.");
    }
  };

  // --- Toplu E-Posta ---
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendBulkEmail = async (e: FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);
    try {
      const result = await sendBulkEmail({ subject: emailSubject, message: emailMessage });
      showToast("success", `${result.message} (${result.recipient_count} alıcıya gönderiliyor.)`);
      setEmailSubject("");
      setEmailMessage("");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "E-posta gönderilemedi.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // --- E-Posta Altyapısı (Resend) ---
  const [resendApiKeyDraft, setResendApiKeyDraft] = useState<string | null>(null);
  const [isSavingResend, setIsSavingResend] = useState(false);
  const { data: adminSettings, isLoading: isLoadingResend } = useSWR(
    "admin-settings-resend",
    fetchAdminSettings,
    {
      onError: (error) =>
        showToast("error", error instanceof ApiError ? error.message : "Ayarlar alınamadı."),
    }
  );
  // Sunucudan gelen değer sadece ilk yüklemede taslağı doldurur; kullanıcı
  // yazmaya başladıktan sonra arka planda gelen bir revalidate onun
  // yazdıklarını ezmesin diye ayrı bir taslak state tutuluyor.
  const resendApiKey = resendApiKeyDraft ?? adminSettings?.resend_api_key ?? "";

  const handleSaveResend = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingResend(true);
    try {
      await updateAdminSettings({ resend_api_key: resendApiKey });
      showToast("success", "Resend API anahtarı başarıyla kaydedildi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "API anahtarı kaydedilemedi.");
    } finally {
      setIsSavingResend(false);
    }
  };

  return (
    <div>
      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-bold shadow-popover ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </div>
        </div>
      )}

      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Pazarlama &amp; Kuponlar</h1>

      <div className="mb-6 flex items-center gap-1.5 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("coupons")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "coupons"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Kupon Yönetimi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "email"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Toplu E-Posta
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resend")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "resend"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          E-Posta Altyapısı (Resend)
        </button>
      </div>

      {activeTab === "coupons" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
            >
              <Tag className="h-4 w-4" />
              Yeni Kupon Ekle
            </button>
          </div>

          {isLoadingCoupons ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <>
              {/* Masaüstü: Veri Tablosu */}
              <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Kupon Kodu</th>
                      <th className="px-4 py-3">İndirim</th>
                      <th className="px-4 py-3">Kullanım</th>
                      <th className="px-4 py-3">Geçerlilik Bitiş</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 font-mono text-xs font-bold text-orange-600">
                            <Tag className="h-3 w-3" />
                            {coupon.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-charcoal">
                          {formatCouponDiscount(coupon)}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {coupon.usage_count}
                          {coupon.usage_limit !== null ? ` / ${coupon.usage_limit}` : " (sınırsız)"}
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDate(coupon.end_date)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleCouponActive(coupon)}
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold transition ${
                              coupon.active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {coupon.active ? "Aktif" : "Pasif"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(coupon)}
                            aria-label="Kuponu Sil"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 active:scale-95"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                          Henüz kupon oluşturulmadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobil: Kompakt Kartlar */}
              <div className="space-y-3 md:hidden">
                {coupons.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-muted">
                    Henüz kupon oluşturulmadı.
                  </div>
                )}
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 font-mono text-xs font-bold text-orange-600">
                        <Tag className="h-3 w-3" />
                        {coupon.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coupon)}
                        aria-label="Kuponu Sil"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600 active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mb-1 font-heading text-lg font-black text-charcoal">
                      {formatCouponDiscount(coupon)} indirim
                    </p>
                    <div className="mb-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-muted">
                      <span>
                        Kullanım: {coupon.usage_count}
                        {coupon.usage_limit !== null ? ` / ${coupon.usage_limit}` : " (sınırsız)"}
                      </span>
                      <span>{formatDate(coupon.end_date)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCouponActive(coupon)}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                        coupon.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {coupon.active ? "Aktif" : "Pasif"}
                    </button>
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={couponPage}
                totalPages={getTotalPages(couponCount, PAGE_SIZE)}
                onPageChange={setCouponPage}
                className="mt-6"
              />
            </>
          )}
        </div>
      )}

      {activeTab === "email" && (
        <form
          onSubmit={handleSendBulkEmail}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
        >
          <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
            <Mail className="h-5 w-5 text-orange-500" />
            Toplu E-Posta Kampanyası
          </h2>
          <p className="mb-5 text-xs text-muted">
            Kampanya e-postası izni veren tüm aktif müşterilere gönderilir.
          </p>

          <div className="mb-4">
            <label htmlFor="bulk-email-subject" className="mb-1.5 block text-sm font-medium text-muted">
              Konu
            </label>
            <input
              id="bulk-email-subject"
              type="text"
              required
              maxLength={200}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Örn: Bu Hafta Sonuna Özel Fırsatlar!"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="bulk-email-message" className="mb-1.5 block text-sm font-medium text-muted">
              İçerik
            </label>
            <textarea
              id="bulk-email-message"
              required
              rows={8}
              maxLength={10000}
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="E-posta içeriğini buraya yazın (düz metin)."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <p className="mt-1 text-xs text-muted">
              Sonuna kampanya iznini geri çekme bilgisi otomatik eklenir.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSendingEmail}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSendingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
            Gönder
          </button>
        </form>
      )}

      {activeTab === "resend" && (
        <form
          onSubmit={handleSaveResend}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
        >
          <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
            <Send className="h-5 w-5 text-orange-500" />
            Resend Entegrasyonu
          </h2>
          <p className="mb-5 text-xs text-muted">
            Toplu e-posta gönderimleri Resend API üzerinden yapılır.
          </p>

          {isLoadingResend ? (
            <div className="flex min-h-[10vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="resend-api-key" className="mb-1.5 block text-sm font-medium text-muted">
                  Resend API Key
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="resend-api-key"
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKeyDraft(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 font-mono text-xs text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Kayıtlı anahtar maskeli döner (Örn: re_********cdef); değiştirmeden kaydederseniz aynı kalır.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSavingResend}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingResend && <Loader2 className="h-4 w-4 animate-spin" />}
                API Anahtarını Kaydet
              </button>
            </>
          )}
        </form>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">Yeni Kupon Ekle</h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCoupon} className="space-y-4 px-5 py-5">
              <div>
                <label htmlFor="coupon-code" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Kupon Kodu
                </label>
                <input
                  id="coupon-code"
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="HOSGELDIN20"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm uppercase text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="coupon-discount-type" className="mb-1.5 block text-sm font-bold text-charcoal">
                    İndirim Tipi
                  </label>
                  <select
                    id="coupon-discount-type"
                    value={couponForm.discountType}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="percentage">Yüzde</option>
                    <option value="fixed">Tutar</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="coupon-value" className="mb-1.5 block text-sm font-bold text-charcoal">
                    İndirim Değeri
                  </label>
                  <div className="relative">
                    <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="coupon-value"
                      type="number"
                      required
                      min={0}
                      step="0.01"
                      value={couponForm.value}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, value: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="coupon-start-date" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Başlangıç
                  </label>
                  <input
                    id="coupon-start-date"
                    type="date"
                    required
                    value={couponForm.startDate}
                    onChange={(e) => setCouponForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="coupon-valid-until" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Geçerlilik Bitiş
                  </label>
                  <input
                    id="coupon-valid-until"
                    type="date"
                    required
                    value={couponForm.endDate}
                    onChange={(e) => setCouponForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="coupon-usage-limit" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Kullanım Limiti (Boş = Sınırsız)
                </label>
                <input
                  id="coupon-usage-limit"
                  type="number"
                  min={1}
                  step="1"
                  value={couponForm.usageLimit}
                  onChange={(e) => setCouponForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label htmlFor="coupon-target-user" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Belirli Kullanıcıya Özel mi? (Kullanıcı ID, Opsiyonel)
                </label>
                <input
                  id="coupon-target-user"
                  type="number"
                  value={couponForm.targetUserId}
                  onChange={(e) => setCouponForm((prev) => ({ ...prev, targetUserId: e.target.value }))}
                  placeholder="Boş = herkese açık genel kupon"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingCoupon}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingCoupon && <Loader2 className="h-4 w-4 animate-spin" />}
                Kuponu Oluştur
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
