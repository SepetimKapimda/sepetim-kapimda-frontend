"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Landmark,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Send,
  User,
  XCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/apiClient";
import { fetchCourierBankInfo, updateCourierBankInfo } from "@/lib/api/courier";
import { changeMyPassword, updateMyProfile } from "@/lib/api/users";
import { fetchTelegramSettings, updateTelegramSettings } from "@/lib/api/telegramSettings";

type ToastState = { type: "success" | "error"; message: string } | null;

export default function CourierAyarlarPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phoneNumber ?? "");
  const [ibanAccountHolder, setIbanAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [isLoadingBankInfo, setIsLoadingBankInfo] = useState(true);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingIban, setIsSavingIban] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [telegramChatId, setTelegramChatId] = useState("");
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(true);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setEmail(user?.email ?? "");
    setPhone(user?.phoneNumber ?? "");
  }, [user]);

  useEffect(() => {
    fetchCourierBankInfo()
      .then((info) => {
        setIbanAccountHolder(info.iban_account_holder ?? "");
        setIban(info.iban ?? "");
      })
      .catch((error) => {
        showToast("error", error instanceof ApiError ? error.message : "Banka bilgisi alınamadı.");
      })
      .finally(() => setIsLoadingBankInfo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTelegramSettings()
      .then((data) => setTelegramChatId(data.telegram_chat_id ?? ""))
      .catch((error) => {
        showToast("error", error instanceof ApiError ? error.message : "Telegram ayarı alınamadı.");
      })
      .finally(() => setIsLoadingTelegram(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await updateMyProfile({ email, phone_number: phone || null });
      await fetchCurrentUser();
      showToast("success", "Profiliniz başarıyla güncellendi!");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Profil güncellenemedi.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveIban = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingIban(true);
    try {
      await updateCourierBankInfo({ iban_account_holder: ibanAccountHolder, iban });
      showToast("success", "Banka bilgileriniz başarıyla güncellendi.");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Banka bilgileri kaydedilemedi.");
    } finally {
      setIsSavingIban(false);
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
      showToast("success", "Şifreniz değiştirildi.");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Şifre güncellenemedi.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/kurye/giris");
  };

  return (
    <div className="relative mx-auto max-w-xl px-4 pb-10 pt-6 sm:px-6">
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

      <button
        type="button"
        onClick={() => router.push("/kurye/panel")}
        className="mb-5 flex items-center gap-1.5 text-sm font-bold text-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        Geri Dön
      </button>

      <h1 className="mb-5 font-heading text-2xl font-black text-gray-900">Ayarlar</h1>

      <form
        onSubmit={handleSaveProfile}
        className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
      >
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
          <User className="h-5 w-5 text-primary" />
          Profil Bilgileri
        </h2>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-muted">Ad Soyad</label>
          <input
            type="text"
            value={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-muted"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-muted">Kullanıcı Adı</label>
          <input
            type="text"
            value={user?.username ?? ""}
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-muted"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="courier-email" className="mb-1.5 block text-sm font-medium text-muted">
            E-posta Adresi
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="courier-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="courier-phone" className="mb-1.5 block text-sm font-medium text-muted">
            Telefon Numarası
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="courier-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xx xxx xx xx"
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSavingProfile}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSavingProfile ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Güncelleniyor...
            </>
          ) : (
            "Kaydet"
          )}
        </button>
      </form>

      <form
        onSubmit={handleSaveIban}
        className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
      >
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
          <Landmark className="h-5 w-5 text-primary" />
          Banka Bilgileri
        </h2>

        <div className="mb-4">
          <label htmlFor="courier-iban-holder" className="mb-1.5 block text-sm font-medium text-muted">
            Hesap Sahibi (Ad Soyad)
          </label>
          <input
            id="courier-iban-holder"
            type="text"
            value={ibanAccountHolder}
            onChange={(e) => setIbanAccountHolder(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="courier-iban" className="mb-1.5 block text-sm font-medium text-muted">
            IBAN
          </label>
          <input
            id="courier-iban"
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="TR..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={isSavingIban || isLoadingBankInfo}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSavingIban ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            "Banka Bilgilerini Kaydet"
          )}
        </button>
      </form>

      <form
        onSubmit={handleSaveTelegram}
        className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
      >
        <h2 className="mb-1 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
          <Send className="h-5 w-5 text-primary" />
          Telegram Bildirimleri
        </h2>
        <p className="mb-4 text-xs text-muted">
          Sipariş atamalarını Telegram&apos;dan almak için botumuza{" "}
          <span className="font-mono font-bold text-charcoal">/start</span> yazın ve size dönen
          sohbet kimliğini aşağıya girin. Boş bırakırsanız Telegram bildirimleri kapanır.
        </p>

        <div className="mb-5">
          <label htmlFor="courier-telegram-chat-id" className="mb-1.5 block text-sm font-medium text-muted">
            Telegram Sohbet Kimliği
          </label>
          <input
            id="courier-telegram-chat-id"
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="Örn. 123456789"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={isSavingTelegram || isLoadingTelegram}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSavingTelegram && <Loader2 className="h-4 w-4 animate-spin" />}
          Telegram Ayarını Kaydet
        </button>
      </form>

      <form
        onSubmit={handleUpdatePassword}
        className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
      >
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
          <KeyRound className="h-5 w-5 text-primary" />
          Şifre Değiştir
        </h2>

        <div className="mb-3">
          <label htmlFor="old-password" className="mb-1.5 block text-sm font-medium text-muted">
            Eski Şifre
          </label>
          <input
            id="old-password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-muted">
            Yeni Şifre
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mb-5">
          <label
            htmlFor="new-password-confirm"
            className="mb-1.5 block text-sm font-medium text-muted"
          >
            Yeni Şifre (Tekrar)
          </label>
          <input
            id="new-password-confirm"
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={isUpdatingPassword}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-bold text-charcoal shadow-soft transition hover:bg-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUpdatingPassword ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Güncelleniyor...
            </>
          ) : (
            "Şifreyi Güncelle"
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" />
        Çıkış Yap
      </button>
    </div>
  );
}
