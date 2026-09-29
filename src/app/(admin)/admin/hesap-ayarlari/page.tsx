"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Send,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
import { changeMyPassword, updateMyProfile } from "@/lib/api/users";
import { fetchTelegramSettings, updateTelegramSettings } from "@/lib/api/telegramSettings";

type ToastState = { type: "success" | "error"; message: string } | null;

export default function AdminHesapAyarlariPage() {
  const user = useAuthStore((state) => state.user);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phoneNumber ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [telegramChatId, setTelegramChatId] = useState("");
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phoneNumber ?? "");
  }, [user]);

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde Telegram ayarı anında
  // gösterilir. Form alanı düzenlenebilir olduğu için sunucu verisi sadece
  // İLK geldiğinde yerel state'i doldurur.
  const { data: telegramData, isLoading: isLoadingTelegram } = useSWR(
    "admin-telegram-settings",
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

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateMyProfile({
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phone || null,
      });
      await fetchCurrentUser();
      showToast("success", "Profil bilgileriniz başarıyla güncellendi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Profil güncellenemedi.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      showToast("error", "Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await changeMyPassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      showToast("success", "Şifreniz başarıyla güncellendi.");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Şifre güncellenemedi.");
    } finally {
      setIsUpdatingPassword(false);
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

      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Hesap Ayarları</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleSaveProfile}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
        >
          <h2 className="mb-5 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
            <User className="h-5 w-5 text-orange-500" />
            Profil Bilgileri
          </h2>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-muted">Kullanıcı Adı</label>
            <input
              type="text"
              value={user?.username ?? ""}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-muted"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="admin-first-name" className="mb-1.5 block text-sm font-medium text-muted">
                Ad
              </label>
              <input
                id="admin-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label htmlFor="admin-last-name" className="mb-1.5 block text-sm font-medium text-muted">
                Soyad
              </label>
              <input
                id="admin-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-muted">
              E-posta
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="admin-phone" className="mb-1.5 block text-sm font-medium text-muted">
              Telefon Numarası
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="admin-phone"
                type="tel"
                value={phone ?? ""}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xx xxx xx xx"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            Bilgileri Kaydet
          </button>
        </form>

        <form
          onSubmit={handleUpdatePassword}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
        >
          <h2 className="mb-5 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
            <Shield className="h-5 w-5 text-orange-500" />
            Şifre Yenileme
          </h2>

          <div className="mb-4">
            <label htmlFor="admin-old-password" className="mb-1.5 block text-sm font-medium text-muted">
              Mevcut Şifre
            </label>
            <div className="relative">
              <input
                id="admin-old-password"
                type={showOldPassword ? "text" : "password"}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-3 pr-10 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword((prev) => !prev)}
                aria-label={showOldPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-charcoal"
              >
                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="admin-new-password" className="mb-1.5 block text-sm font-medium text-muted">
              Yeni Şifre
            </label>
            <div className="relative">
              <input
                id="admin-new-password"
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-3 pr-10 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-charcoal"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="admin-new-password-confirm" className="mb-1.5 block text-sm font-medium text-muted">
              Yeni Şifre (Tekrar)
            </label>
            <div className="relative">
              <input
                id="admin-new-password-confirm"
                type={showNewPasswordConfirm ? "text" : "password"}
                required
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-3 pr-10 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={() => setShowNewPasswordConfirm((prev) => !prev)}
                aria-label={showNewPasswordConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-charcoal"
              >
                {showNewPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <KeyRound className="h-4 w-4" />
            {isUpdatingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      </div>

      <form
        onSubmit={handleSaveTelegram}
        className="mt-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
      >
        <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold text-charcoal">
          <Send className="h-5 w-5 text-orange-500" />
          Telegram Bildirimleri
        </h2>
        <p className="mb-4 text-xs text-muted">
          Yeni sipariş ve kritik sistem hatası uyarılarını Telegram&apos;dan almak için botumuza{" "}
          <span className="font-mono font-bold text-charcoal">/start</span> yazın ve size dönen
          sohbet kimliğini aşağıya girin. Boş bırakırsanız Telegram bildirimleri kapanır.
        </p>

        <div className="mb-5 max-w-sm">
          <label htmlFor="admin-telegram-chat-id" className="mb-1.5 block text-sm font-medium text-muted">
            Telegram Sohbet Kimliği
          </label>
          <input
            id="admin-telegram-chat-id"
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="Örn. 123456789"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={isSavingTelegram || isLoadingTelegram}
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSavingTelegram && <Loader2 className="h-4 w-4 animate-spin" />}
          Telegram Ayarını Kaydet
        </button>
      </form>
    </div>
  );
}
