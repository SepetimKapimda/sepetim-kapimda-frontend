"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Image as ImageIcon,
  Landmark,
  Loader2,
  Lock,
  Mail,
  Phone,
  Send,
  Upload,
  User,
  XCircle,
} from "lucide-react";
import { useMarketStore } from "@/store/useMarketStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/apiClient";
import { fetchMarketSettings, updateMarketSettings } from "@/lib/api/vendorSettings";
import { fetchMarketBankInfo, updateMarketBankInfo } from "@/lib/api/vendorPayouts";
import { changeMyPassword, updateMyProfile } from "@/lib/api/users";
import { fetchTelegramSettings, updateTelegramSettings } from "@/lib/api/telegramSettings";

type SettingsTab = "market" | "account";

type ToastState = { type: "success" | "error"; message: string } | null;

function VendorAyarlarContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    (searchParams.get("tab") as SettingsTab) || "market"
  );
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  // --- Market Ayarları state ---
  const [heroBannerFile, setHeroBannerFile] = useState<File | null>(null);
  const [promoBannerFile, setPromoBannerFile] = useState<File | null>(null);
  const [heroBannerPreview, setHeroBannerPreview] = useState<string | null>(null);
  const [promoBannerPreview, setPromoBannerPreview] = useState<string | null>(null);
  const heroBannerInputRef = useRef<HTMLInputElement>(null);
  const promoBannerInputRef = useRef<HTMLInputElement>(null);
  // null = değiştirilmedi, "" = mevcut mobil banner kaldırılmak üzere işaretlendi, File = yeni yükleme.
  const [mobileHeroBannerFile, setMobileHeroBannerFile] = useState<File | "" | null>(null);
  const [mobileHeroBannerPreview, setMobileHeroBannerPreview] = useState<string | null>(null);
  const mobileHeroBannerInputRef = useRef<HTMLInputElement>(null);

  const openingTime = useMarketStore((state) => state.openingTime);
  const closingTime = useMarketStore((state) => state.closingTime);
  const setHours = useMarketStore((state) => state.setHours);
  const fetchMarketHours = useMarketStore((state) => state.fetchSettings);
  const [minOrderAmount, setMinOrderAmount] = useState("0.00");
  const [isTemporarilyClosed, setIsTemporarilyClosed] = useState(false);
  const [isSavingMarket, setIsSavingMarket] = useState(false);

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde ayarlar anında
  // gösterilir. Form alanları düzenlenebilir olduğu için sunucu verisi sadece
  // İLK geldiğinde yerel state'i doldurur.
  const { data: marketSettingsData, isLoading: isLoadingMarketSettings } = useSWR(
    "vendor-market-settings",
    fetchMarketSettings,
    {
      onError: (error) =>
        showToast("error", error instanceof ApiError ? error.message : "Market ayarları alınamadı."),
    }
  );
  const didInitMarketSettings = useRef(false);
  useEffect(() => {
    if (marketSettingsData && !didInitMarketSettings.current) {
      setHours(
        marketSettingsData.opening_time.slice(0, 5),
        marketSettingsData.closing_time.slice(0, 5)
      );
      setMinOrderAmount(marketSettingsData.min_order_amount);
      setIsTemporarilyClosed(marketSettingsData.is_temporarily_closed);
      setHeroBannerPreview(marketSettingsData.hero_banner_image);
      setPromoBannerPreview(marketSettingsData.promo_sidebar_image);
      setMobileHeroBannerPreview(marketSettingsData.mobile_hero_banner_image);
      didInitMarketSettings.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketSettingsData]);

  // --- Hesap Ayarları state ---
  const authUser = useAuthStore((state) => state.user);
  const [firstName, setFirstName] = useState(authUser?.firstName ?? "");
  const [lastName, setLastName] = useState(authUser?.lastName ?? "");
  const [email, setEmail] = useState(authUser?.email ?? "");
  const [phone, setPhone] = useState(authUser?.phoneNumber ?? "");
  const [ibanAccountHolder, setIbanAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [telegramChatId, setTelegramChatId] = useState("");
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  const { data: telegramData, isLoading: isLoadingTelegram } = useSWR(
    "vendor-telegram-settings",
    fetchTelegramSettings,
    {
      onError: (error) =>
        showToast("error", error instanceof ApiError ? error.message : "Telegram ayarı alınamadı."),
    }
  );
  const didInitTelegram = useRef(false);
  useEffect(() => {
    if (telegramData && !didInitTelegram.current) {
      setTelegramChatId(telegramData.telegram_chat_id ?? "");
      didInitTelegram.current = true;
    }
  }, [telegramData]);

  const {
    data: bankInfoData,
    isLoading: isLoadingBankInfo,
    mutate: mutateBankInfo,
  } = useSWR(
    "vendor-bank-info",
    fetchMarketBankInfo,
    {
      onError: (error) =>
        showToast("error", error instanceof ApiError ? error.message : "Banka bilgisi alınamadı."),
    }
  );
  const didInitBankInfo = useRef(false);
  useEffect(() => {
    if (bankInfoData && !didInitBankInfo.current) {
      setIbanAccountHolder(bankInfoData.iban_account_holder ?? "");
      setIban(bankInfoData.iban ?? "");
      didInitBankInfo.current = true;
    }
  }, [bankInfoData]);

  const handleHeroBannerPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroBannerFile(file);
    setHeroBannerPreview(URL.createObjectURL(file));
  };

  const handlePromoBannerPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPromoBannerFile(file);
    setPromoBannerPreview(URL.createObjectURL(file));
  };

  const handleMobileHeroBannerPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMobileHeroBannerFile(file);
    setMobileHeroBannerPreview(URL.createObjectURL(file));
  };

  const handleRemoveMobileHeroBanner = () => {
    setMobileHeroBannerFile("");
    setMobileHeroBannerPreview(null);
    if (mobileHeroBannerInputRef.current) mobileHeroBannerInputRef.current.value = "";
  };

  const handleSaveMarket = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingMarket(true);
    try {
      await updateMarketSettings({
        opening_time: openingTime,
        closing_time: closingTime,
        min_order_amount: minOrderAmount,
        is_temporarily_closed: isTemporarilyClosed,
        ...(heroBannerFile ? { hero_banner_image: heroBannerFile } : {}),
        ...(mobileHeroBannerFile !== null ? { mobile_hero_banner_image: mobileHeroBannerFile } : {}),
        ...(promoBannerFile ? { promo_sidebar_image: promoBannerFile } : {}),
      });
      await fetchMarketHours();
      showToast("success", "Market ayarları başarıyla kaydedildi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Market ayarları kaydedilemedi.");
    } finally {
      setIsSavingMarket(false);
    }
  };

  const handleSaveBankInfo = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingBank(true);
    try {
      await updateMarketBankInfo({ iban_account_holder: ibanAccountHolder, iban });
      mutateBankInfo({ iban_account_holder: ibanAccountHolder, iban }, { revalidate: false });
      showToast("success", "Banka bilgileri başarıyla kaydedildi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Banka bilgileri kaydedilemedi.");
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSaveAccount = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingAccount(true);
    try {
      await updateMyProfile({
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phone || null,
      });
      await useAuthStore.getState().fetchCurrentUser();
      showToast("success", "Kişisel bilgiler başarıyla kaydedildi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Kişisel bilgiler kaydedilemedi.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleSaveTelegram = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingTelegram(true);
    try {
      await updateTelegramSettings(telegramChatId || null);
      showToast("success", "Telegram ayarı kaydedildi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Telegram ayarı kaydedilemedi.");
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    if (newPassword !== newPasswordConfirm) {
      showToast("error", "Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await changeMyPassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      showToast("success", "Şifreniz başarıyla değiştirildi.");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Şifre değiştirilemedi.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-2xl">
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

      <h1 className="mb-5 font-heading text-2xl font-black text-gray-900">Ayarlar</h1>

      <div className="mb-6 flex items-center gap-1.5 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("market")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "market"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Market Ayarları
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "account"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Hesap Ayarları
        </button>
      </div>

      {activeTab === "market" && (
        <form
          onSubmit={handleSaveMarket}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
        >
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
            <ImageIcon className="h-5 w-5 text-orange-500" />
            Vitrin Bannerları
          </h2>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-bold text-charcoal">Ana Kampanya Banner&apos;ı</span>
              <input
                ref={heroBannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleHeroBannerPick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => heroBannerInputRef.current?.click()}
                className="flex aspect-[3/1] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                {heroBannerPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroBannerPreview}
                    alt="Ana kampanya banner önizleme"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span className="text-xs font-bold">Banner Yükle</span>
                    <span className="text-[11px] text-gray-400">Önerilen boyut: 1200x400 px</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-bold text-charcoal">Yan Promosyon Banner&apos;ı</span>
              <input
                ref={promoBannerInputRef}
                type="file"
                accept="image/*"
                onChange={handlePromoBannerPick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => promoBannerInputRef.current?.click()}
                className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                {promoBannerPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={promoBannerPreview}
                    alt="Yan promosyon banner önizleme"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span className="text-xs font-bold">Banner Yükle</span>
                    <span className="text-[11px] text-gray-400">Önerilen: 300x375 px</span>
                  </>
                )}
              </button>
            </div>

            <div className="sm:col-span-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="block text-sm font-bold text-charcoal">
                  Mobil Kampanya Banner&apos;ı (Opsiyonel)
                </span>
                {mobileHeroBannerPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveMobileHeroBanner}
                    className="text-xs font-bold text-red-500 transition hover:text-red-600"
                  >
                    Kaldır
                  </button>
                )}
              </div>
              <input
                ref={mobileHeroBannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleMobileHeroBannerPick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => mobileHeroBannerInputRef.current?.click()}
                className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                {mobileHeroBannerPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mobileHeroBannerPreview}
                    alt="Mobil kampanya banner önizleme"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span className="text-xs font-bold">Mobil Banner Yükle</span>
                    <span className="text-[11px] text-gray-400">
                      Boş bırakılırsa mobilde de ana banner kullanılır
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mb-5 flex gap-3">
            <div className="flex-1">
              <label htmlFor="market-opening" className="mb-1.5 block text-sm font-bold text-charcoal">
                Açılış Saati
              </label>
              <input
                id="market-opening"
                type="time"
                value={openingTime}
                onChange={(e) => setHours(e.target.value, closingTime)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="market-closing" className="mb-1.5 block text-sm font-bold text-charcoal">
                Kapanış Saati
              </label>
              <input
                id="market-closing"
                type="time"
                value={closingTime}
                onChange={(e) => setHours(openingTime, e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="market-min-order" className="mb-1.5 block text-sm font-bold text-charcoal">
                Minimum Sepet Tutarı (₺)
              </label>
              <input
                id="market-min-order"
                type="number"
                min={0}
                step="0.01"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <label className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2.5">
              <span className="text-sm font-bold text-charcoal">Geçici Olarak Kapalı</span>
              <button
                type="button"
                onClick={() => setIsTemporarilyClosed((prev) => !prev)}
                role="switch"
                aria-checked={isTemporarilyClosed}
                aria-label="Marketi geçici olarak kapat"
                className={`relative h-6 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 ${
                  isTemporarilyClosed ? "bg-red-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
                    isTemporarilyClosed ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSavingMarket || isLoadingMarketSettings}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingMarket ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Market Ayarlarını Kaydet"
            )}
          </button>
        </form>
      )}

      {activeTab === "account" && (
        <form
          onSubmit={handleSaveAccount}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
        >
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
            <User className="h-5 w-5 text-orange-500" />
            Kişisel Bilgiler
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="owner-first-name" className="mb-1.5 block text-sm font-medium text-muted">
                Ad
              </label>
              <input
                id="owner-first-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label htmlFor="owner-last-name" className="mb-1.5 block text-sm font-medium text-muted">
                Soyad
              </label>
              <input
                id="owner-last-name"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="owner-email" className="mb-1.5 block text-sm font-medium text-muted">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="owner-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="owner-phone" className="mb-1.5 block text-sm font-medium text-muted">
              Telefon Numarası
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="owner-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xx xxx xx xx"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingAccount}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingAccount ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Kişisel Bilgileri Kaydet"
            )}
          </button>
        </form>
      )}

      {activeTab === "account" && (
        <form
          onSubmit={handleSaveBankInfo}
          className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
        >
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
            <Landmark className="h-5 w-5 text-orange-500" />
            Banka &amp; Ödeme Bilgileri
          </h2>

          <div className="mb-4">
            <label htmlFor="iban-account-holder" className="mb-1.5 block text-sm font-medium text-muted">
              Hesap Sahibi (Ad Soyad)
            </label>
            <input
              id="iban-account-holder"
              type="text"
              required
              value={ibanAccountHolder}
              onChange={(e) => setIbanAccountHolder(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="iban-number" className="mb-1.5 block text-sm font-medium text-muted">
              IBAN
            </label>
            <input
              id="iban-number"
              type="text"
              required
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="TR..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingBank || isLoadingBankInfo}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingBank && <Loader2 className="h-4 w-4 animate-spin" />}
            Banka Bilgilerini Kaydet
          </button>
        </form>
      )}

      {activeTab === "account" && (
        <form
          onSubmit={handleSaveTelegram}
          className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
        >
          <h2 className="mb-1 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
            <Send className="h-5 w-5 text-orange-500" />
            Telegram Bildirimleri
          </h2>
          <p className="mb-4 text-xs text-muted">
            Yeni sipariş bildirimlerini Telegram&apos;dan almak için botumuza{" "}
            <span className="font-mono font-bold text-charcoal">/start</span> yazın ve size dönen
            sohbet kimliğini aşağıya girin. Boş bırakırsanız Telegram bildirimleri kapanır.
          </p>

          <div className="mb-5">
            <label htmlFor="telegram-chat-id" className="mb-1.5 block text-sm font-medium text-muted">
              Telegram Sohbet Kimliği
            </label>
            <input
              id="telegram-chat-id"
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Örn. 123456789"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingTelegram || isLoadingTelegram}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingTelegram && <Loader2 className="h-4 w-4 animate-spin" />}
            Telegram Ayarını Kaydet
          </button>
        </form>
      )}

      {activeTab === "account" && (
        <form
          onSubmit={handleChangePassword}
          className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
        >
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
            <Lock className="h-5 w-5 text-orange-500" />
            Şifre Değiştir
          </h2>

          <div className="mb-4">
            <label htmlFor="owner-old-password" className="mb-1.5 block text-sm font-medium text-muted">
              Eski Şifre
            </label>
            <input
              id="owner-old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="owner-new-password" className="mb-1.5 block text-sm font-medium text-muted">
              Yeni Şifre
            </label>
            <input
              id="owner-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="owner-new-password-confirm"
              className="mb-1.5 block text-sm font-medium text-muted"
            >
              Yeni Şifre (Tekrar)
            </label>
            <input
              id="owner-new-password-confirm"
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingPassword}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Şifreyi Değiştir"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function VendorAyarlarPage() {
  return (
    <Suspense fallback={null}>
      <VendorAyarlarContent />
    </Suspense>
  );
}
