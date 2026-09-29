"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import Image from "next/image";
import {
  CheckCircle2,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  PiggyBank,
  Percent,
  Pencil,
  PowerOff,
  Trash2,
  Truck,
  Upload,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { isSupabaseUrl } from "@/lib/resolveMediaUrl";
import { fetchAdminSettings, updateAdminSettings } from "@/lib/api/adminSettings";
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  updateBanner,
  type Banner,
  type BannerWritePayload,
} from "@/lib/api/adminBanners";
import { useBrandingStore } from "@/store/useBrandingStore";

type ToastState = { type: "success" | "error"; message: string } | null;

const emptyBannerForm = {
  title: "",
  subtitle: "",
  button_text: "",
  link: "",
  order: 0,
};

export default function AdminAyarlarPage() {
  const [markupRate, setMarkupRate] = useState("0");
  const [courierBaseFee, setCourierBaseFee] = useState("0");
  const [adminProfitShare, setAdminProfitShare] = useState("0");
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
  // null = değiştirilmedi, "" = mevcut mobil görsel kaldırılmak üzere işaretlendi, File = yeni yükleme.
  const [bannerMobileImageFile, setBannerMobileImageFile] = useState<File | "" | null>(null);
  const [bannerMobileImagePreview, setBannerMobileImagePreview] = useState<string | null>(null);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);
  const bannerMobileImageInputRef = useRef<HTMLInputElement>(null);

  // --- Marka Yönetimi (Logo & Favicon) ---
  const logoUrl = useBrandingStore((state) => state.logoUrl);
  const faviconUrl = useBrandingStore((state) => state.faviconUrl);
  const setLogo = useBrandingStore((state) => state.setLogo);
  const setFavicon = useBrandingStore((state) => state.setFavicon);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isSavingFavicon, setIsSavingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde ayarlar/afişler anında
  // gösterilir, arka planda tazelenir.
  const { data: settingsData, isLoading: isLoadingSettings } = useSWR(
    "admin-settings-platform",
    fetchAdminSettings,
    {
      onError: (error) =>
        showToast("error", error instanceof ApiError ? error.message : "Ayarlar alınamadı."),
    }
  );

  // Form alanları düzenlenebilir olduğu için sunucu verisi sadece İLK geldiğinde
  // yerel state'i doldurur — arka planda gelen bir revalidate, kullanıcının o an
  // düzenlemekte olduğu alanları ezmesin diye tekrar tetiklenmez.
  const didInitSettings = useRef(false);
  useEffect(() => {
    if (settingsData && !didInitSettings.current) {
      setMarkupRate(settingsData.markup_rate);
      setCourierBaseFee(settingsData.courier_base_fee);
      setAdminProfitShare(settingsData.admin_profit_share);
      setIsOrderingOpen(settingsData.is_ordering_open);
      didInitSettings.current = true;
    }
  }, [settingsData]);

  const {
    data: bannerData,
    isLoading: isLoadingBanners,
    mutate: mutateBanners,
  } = useSWR("admin-banners", () => fetchBanners().then((data) => data.results), {
    onError: (error) => showToast("error", error instanceof ApiError ? error.message : "Afişler alınamadı."),
  });
  const banners = bannerData ?? [];

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAdminSettings({
        markup_rate: markupRate,
        admin_profit_share: adminProfitShare,
        courier_base_fee: courierBaseFee,
        is_ordering_open: isOrderingOpen,
      });
      showToast("success", "Platform ayarları başarıyla kaydedildi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Ayarlar kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const openAddBannerModal = () => {
    setEditingBanner(null);
    setBannerForm(emptyBannerForm);
    setBannerImageFile(null);
    setBannerImagePreview(null);
    setBannerMobileImageFile(null);
    setBannerMobileImagePreview(null);
    setIsBannerModalOpen(true);
  };

  const openEditBannerModal = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      button_text: banner.button_text ?? "",
      link: banner.link ?? "",
      order: banner.order,
    });
    setBannerImageFile(null);
    setBannerImagePreview(banner.image);
    setBannerMobileImageFile(null);
    setBannerMobileImagePreview(banner.mobile_image);
    setIsBannerModalOpen(true);
  };

  const closeBannerModal = () => setIsBannerModalOpen(false);

  // Backend, XSS riski nedeniyle `image/svg+xml` yüklemelerini 400 ile
  // reddediyor — bu yüzden kabul listesinden tamamen çıkarıldı.
  const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const ACCEPTED_FAVICON_TYPES = ["image/png", "image/x-icon", "image/vnd.microsoft.icon"];
  const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
  const FAVICON_MAX_SIZE_BYTES = 1024 * 1024;

  const handleLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      showToast("error", "Yalnızca PNG, JPG veya WEBP dosyaları yüklenebilir.");
      return;
    }
    if (file.size > LOGO_MAX_SIZE_BYTES) {
      showToast("error", "Logo dosyası 2 MB'ı geçemez.");
      return;
    }
    setIsSavingLogo(true);
    try {
      const updated = await updateAdminSettings({ logo: file });
      if (updated.logo_url) setLogo(updated.logo_url);
      showToast("success", "Logo güncellendi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Logo yüklenemedi.");
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleFaviconPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_FAVICON_TYPES.includes(file.type)) {
      showToast("error", "Yalnızca PNG veya ICO dosyaları yüklenebilir.");
      return;
    }
    if (file.size > FAVICON_MAX_SIZE_BYTES) {
      showToast("error", "Favicon dosyası 1 MB'ı geçemez.");
      return;
    }
    setIsSavingFavicon(true);
    try {
      const updated = await updateAdminSettings({ favicon: file });
      if (updated.favicon_url) setFavicon(updated.favicon_url);
      showToast("success", "Favicon güncellendi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Favicon yüklenemedi.");
    } finally {
      setIsSavingFavicon(false);
    }
  };

  const handleBannerImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerImageFile(file);
      setBannerImagePreview(URL.createObjectURL(file));
    }
  };

  const handleBannerMobileImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerMobileImageFile(file);
      setBannerMobileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveBannerMobileImage = () => {
    setBannerMobileImageFile("");
    setBannerMobileImagePreview(null);
    if (bannerMobileImageInputRef.current) bannerMobileImageInputRef.current.value = "";
  };

  const handleSubmitBanner = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingBanner && !bannerImageFile) {
      showToast("error", "Yeni afiş için görsel zorunludur.");
      return;
    }
    setIsSavingBanner(true);
    try {
      const payload: BannerWritePayload = {
        title: bannerForm.title || null,
        subtitle: bannerForm.subtitle || null,
        button_text: bannerForm.button_text || null,
        link: bannerForm.link || null,
        order: bannerForm.order,
        ...(bannerImageFile ? { image: bannerImageFile } : {}),
        ...(bannerMobileImageFile !== null ? { mobile_image: bannerMobileImageFile } : {}),
      };
      if (editingBanner) {
        await updateBanner(editingBanner.id, payload);
        showToast("success", "Afiş güncellendi.");
      } else {
        await createBanner({ ...payload, is_active: true });
        showToast("success", "Yeni afiş eklendi.");
      }
      setIsBannerModalOpen(false);
      mutateBanners();
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Afiş kaydedilemedi.");
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleToggleBannerActive = async (banner: Banner) => {
    try {
      const updated = await updateBanner(banner.id, { is_active: !banner.is_active });
      // Sunucunun onayladığı gerçek değeri yaz — istemci tahminiyle (`!is_active`)
      // güncellemek, art arda hızlı tıklamada ekranı gerçek durumdan saptırabilir.
      mutateBanners(
        (current) => current && current.map((b) => (b.id === banner.id ? { ...b, is_active: updated.is_active } : b)),
        { revalidate: false }
      );
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Afiş durumu değiştirilemedi.");
    }
  };

  const handleDeleteBanner = async (banner: Banner) => {
    if (!window.confirm(`"${banner.title || `Afiş #${banner.id}`}" kalıcı olarak silinsin mi?`)) return;
    try {
      await deleteBanner(banner.id);
      mutateBanners((current) => current && current.filter((b) => b.id !== banner.id), {
        revalidate: false,
      });
      showToast("success", "Afiş silindi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Afiş silinemedi.");
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

      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Platform Ayarları</h1>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
          <ImageIcon className="h-5 w-5 text-orange-500" />
          Marka Yönetimi (Logo &amp; Favicon)
        </h2>
        <p className="mb-5 text-xs text-muted">
          Uygulama genelindeki logo ve tarayıcı sekmesi ikonu. Değişiklik anında tüm panellere yansır.
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm font-bold text-charcoal">Logo</span>
            <input
              ref={logoInputRef}
              id="brand-logo-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={isSavingLogo}
              className="flex aspect-[3/1] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingLogo ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Image
                  src={logoUrl || "/logo.png"}
                  alt="Logo önizleme"
                  width={160}
                  height={80}
                  unoptimized={!!logoUrl}
                  className="h-full w-auto object-contain"
                />
              )}
            </button>
            <p className="mt-1.5 text-xs text-muted">PNG/JPG/WEBP, maks. 2 MB.</p>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-bold text-charcoal">Favicon</span>
            <input
              ref={faviconInputRef}
              id="brand-favicon-input"
              type="file"
              accept="image/png,image/x-icon"
              onChange={handleFaviconPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => faviconInputRef.current?.click()}
              disabled={isSavingFavicon}
              className="flex aspect-[3/1] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingFavicon ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Image
                  src={faviconUrl || "/favicon.png"}
                  alt="Favicon önizleme"
                  width={48}
                  height={48}
                  unoptimized={!!faviconUrl}
                  className="h-12 w-12 object-contain"
                />
              )}
            </button>
            <p className="mt-1.5 text-xs text-muted">PNG/ICO, maks. 1 MB, kare görsel önerilir.</p>
          </div>
        </div>
      </div>

      {isLoadingSettings ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
                <Wallet className="h-5 w-5 text-orange-500" />
                Finans &amp; Komisyon Ayarları
              </h2>
              <p className="mb-5 text-xs text-muted">
                Sistemin markup ve kurye maliyet mantığını belirleyen temel oranlar.
              </p>

              <div className="mb-4">
                <label htmlFor="markup-rate" className="mb-1.5 block text-sm font-medium text-muted">
                  Global Markup Oranı (%)
                </label>
                <div className="relative">
                  <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="markup-rate"
                    type="number"
                    min={0}
                    step="0.1"
                    value={markupRate}
                    onChange={(e) => setMarkupRate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">Marketin ürün fiyatının üzerine eklenen platform kâr marjı.</p>
              </div>

              <div className="mb-4">
                <label htmlFor="admin-profit-share" className="mb-1.5 block text-sm font-medium text-muted">
                  Admin Kâr Payı Oranı (%)
                </label>
                <div className="relative">
                  <PiggyBank className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="admin-profit-share"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={adminProfitShare}
                    onChange={(e) => setAdminProfitShare(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  Geriye kalan oran (%{(100 - Number(adminProfitShare || 0)).toLocaleString("tr-TR")}) Kurye Yöneticisine aktarılır.
                </p>
              </div>

              <div>
                <label htmlFor="courier-base-fee" className="mb-1.5 block text-sm font-medium text-muted">
                  Sabit Kurye Gideri (₺)
                </label>
                <div className="relative">
                  <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="courier-base-fee"
                    type="number"
                    min={0}
                    step="0.5"
                    value={courierBaseFee}
                    onChange={(e) => setCourierBaseFee(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">Tamamlanan her paket için kuryeye yazılan sabit hakediş.</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
                <PowerOff className="h-5 w-5 text-orange-500" />
                Sistem Durumu
              </h2>
              <p className="mb-5 text-xs text-muted">Platformun genel sipariş kabul durumu.</p>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-charcoal">Platformu Siparişlere Kapat / Aç</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {isOrderingOpen
                      ? "Platform şu anda yeni sipariş kabul ediyor."
                      : "Platform bakım modunda — yeni sipariş alınmıyor."}
                  </p>
                </div>

                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={isOrderingOpen}
                    onChange={() => setIsOrderingOpen((prev) => !prev)}
                    aria-label="Platformu siparişlere kapat veya aç"
                    className="peer sr-only"
                  />
                  <div className="relative h-7 w-14 rounded-full bg-gray-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-7 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange-500/40" />
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
          >
            {isSaving ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </button>
        </form>
      )}

      <div className="mt-8 rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-charcoal">
            <ImagePlus className="h-5 w-5 text-orange-500" />
            Afiş Yönetimi
          </h2>
          <button
            type="button"
            onClick={openAddBannerModal}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-orange-600 active:scale-95"
          >
            <Upload className="h-3.5 w-3.5" />
            Yeni Afiş Ekle
          </button>
        </div>

        {isLoadingBanners ? (
          <div className="flex min-h-[15vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : banners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-muted">
            Henüz afiş eklenmedi.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner) => (
              <div key={banner.id} className="overflow-hidden rounded-xl border border-gray-100">
                <div className="relative h-32 w-full">
                  <Image
                    src={banner.image}
                    alt={banner.title ?? "Afiş"}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized={isSupabaseUrl(banner.image)}
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-charcoal">{banner.title || "(Başlıksız)"}</p>
                  <p className="mb-2 truncate text-xs text-muted">Sıra: {banner.order}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleBannerActive(banner)}
                      className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${
                        banner.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {banner.is_active ? "Aktif" : "Pasif"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditBannerModal(banner)}
                      aria-label="Düzenle"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-muted transition hover:border-orange-500 hover:text-orange-500 active:scale-95"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner)}
                      aria-label="Sil"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isBannerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeBannerModal}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                {editingBanner ? "Afişi Düzenle" : "Yeni Afiş Ekle"}
              </h2>
              <button
                type="button"
                onClick={closeBannerModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitBanner} className="space-y-4 px-5 py-5">
              <div>
                <span className="mb-1.5 block text-sm font-bold text-charcoal">Afiş Görseli</span>
                <input
                  ref={bannerImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImagePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bannerImageInputRef.current?.click()}
                  className="flex aspect-[3/1] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                >
                  {bannerImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerImagePreview} alt="Afiş önizleme" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6" />
                      <span className="text-xs font-bold">Görsel Yükle</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="block text-sm font-bold text-charcoal">Mobil Afiş (Opsiyonel)</span>
                  {bannerMobileImagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveBannerMobileImage}
                      className="flex items-center gap-1 text-xs font-bold text-red-500 transition hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                      Kaldır
                    </button>
                  )}
                </div>
                <input
                  ref={bannerMobileImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerMobileImagePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bannerMobileImageInputRef.current?.click()}
                  className="flex aspect-[9/16] w-full max-w-[160px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                >
                  {bannerMobileImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bannerMobileImagePreview}
                      alt="Mobil afiş önizleme"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span className="text-xs font-bold">Mobil Görsel Yükle</span>
                    </>
                  )}
                </button>
                <p className="mt-1.5 text-xs text-muted">
                  Boş bırakılırsa mobilde de masaüstü görseli kullanılır.
                </p>
              </div>

              <div>
                <label htmlFor="banner-title" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Başlık
                </label>
                <input
                  id="banner-title"
                  type="text"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label htmlFor="banner-subtitle" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Alt Metin
                </label>
                <input
                  id="banner-subtitle"
                  type="text"
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="banner-button-text" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Buton Metni
                  </label>
                  <input
                    id="banner-button-text"
                    type="text"
                    value={bannerForm.button_text}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, button_text: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="banner-order" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Sıra
                  </label>
                  <input
                    id="banner-order"
                    type="number"
                    value={bannerForm.order}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, order: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="banner-link" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Bağlantı URL
                </label>
                <input
                  id="banner-link"
                  type="text"
                  value={bannerForm.link}
                  onChange={(e) => setBannerForm((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="/kategoriler/meyve-sebze"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingBanner}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingBanner && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
