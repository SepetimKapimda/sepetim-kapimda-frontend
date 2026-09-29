"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/apiClient";
import { fetchPageBySlug, type DynamicPageDetail } from "@/lib/api/pages";

type AuthTab = "login" | "register";
type RegisterLegalDoc = "kvkk" | "uyelik-sozlesmesi" | "acik-riza-beyani";

const registerLegalDocFallbackTitles: Record<RegisterLegalDoc, string> = {
  kvkk: "KVKK Aydınlatma Metni",
  "uyelik-sozlesmesi": "Üyelik Sözleşmesi",
  "acik-riza-beyani": "Açık Rıza Beyanı",
};

export default function AuthModal() {
  const isOpen = useAuthStore((state) => state.isAuthModalOpen);
  const closeAuthModal = useAuthStore((state) => state.closeAuthModal);
  const loginCustomer = useAuthStore((state) => state.loginCustomer);
  const registerCustomer = useAuthStore((state) => state.registerCustomer);
  const authError = useAuthStore((state) => state.authError);

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  // Checkbox 1 (zorunlu): API'nin Register şemasındaki iki ayrı zorunlu
  // alanına (accepted_privacy, accepted_terms) sadık kalmak için state'ler
  // ayrı tutulur, ancak tek bir UI kutucuğu olarak birlikte güncellenir.
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Checkbox 2 (opsiyonel): Açık Rıza Beyanı + pazarlama izni.
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);

  const [activeLegalDoc, setActiveLegalDoc] = useState<RegisterLegalDoc | null>(null);
  const [legalDocContent, setLegalDocContent] = useState<DynamicPageDetail | null>(null);
  const [isLoadingLegalDoc, setIsLoadingLegalDoc] = useState(false);
  const [legalDocError, setLegalDocError] = useState<string | null>(null);

  const handleConsentChange = (checked: boolean) => {
    setAcceptedPrivacy(checked);
    setAcceptedTerms(checked);
  };

  const openLegalDoc = (doc: RegisterLegalDoc) => {
    setActiveLegalDoc(doc);
    setLegalDocContent(null);
    setLegalDocError(null);
    setIsLoadingLegalDoc(true);
    fetchPageBySlug(doc)
      .then(setLegalDocContent)
      .catch((error) => {
        setLegalDocError(
          error instanceof ApiError && error.status === 404
            ? "Bu sözleşme metni henüz yayınlanmadı."
            : "Sözleşme metni alınamadı."
        );
      })
      .finally(() => setIsLoadingLegalDoc(false));
  };
  const closeLegalDoc = () => setActiveLegalDoc(null);

  // Modal `isOpen === false` olduğunda unmount olmuyor (sadece null
  // render ediyor), bu yüzden form alanları ve aktif sekme kapatıldığında
  // elle sıfırlanmazsa bir sonraki açılışta eski veriyle kalır.
  const resetForm = () => {
    setActiveTab("login");
    setLoginUsername("");
    setLoginPassword("");
    setRegisterUsername("");
    setRegisterFirstName("");
    setRegisterLastName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterPasswordConfirm("");
    setAcceptedPrivacy(false);
    setAcceptedTerms(false);
    setAcceptsMarketing(false);
    setActiveLegalDoc(null);
  };

  const handleClose = () => {
    closeAuthModal();
    resetForm();
  };

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await loginCustomer(loginUsername, loginPassword);
      resetForm();
    } catch {
      // Hata mesajı authError üzerinden formda gösteriliyor.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await registerCustomer({
        username: registerUsername,
        email: registerEmail,
        password: registerPassword,
        passwordConfirm: registerPasswordConfirm,
        firstName: registerFirstName,
        lastName: registerLastName,
        acceptedTerms,
        acceptedPrivacy,
        acceptsMarketing,
      });
      resetForm();
    } catch {
      // Hata mesajı authError üzerinden formda gösteriliyor.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeTab === "login" ? "Giriş Yap" : "Kayıt Ol"}
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white px-6 pb-6 pt-6 shadow-popover sm:px-7 sm:pb-6 sm:pt-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-charcoal">
            {activeTab === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-offwhite hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sekmeler */}
        <div className="mb-6 flex items-center gap-6 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`relative pb-3 text-sm font-bold transition ${
              activeTab === "login" ? "text-charcoal" : "text-muted hover:text-charcoal"
            }`}
          >
            Giriş Yap
            {activeTab === "login" && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#FF5000]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`relative pb-3 text-sm font-bold transition ${
              activeTab === "register" ? "text-charcoal" : "text-muted hover:text-charcoal"
            }`}
          >
            Kayıt Ol
            {activeTab === "register" && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#FF5000]" />
            )}
          </button>
        </div>

        {authError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {authError}
          </div>
        )}

        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-charcoal">
                Kullanıcı Adı
              </span>
              <input
                required
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="kullanici_adi"
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-charcoal">
                Şifre
              </span>
              <input
                required
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF5000] py-3.5 text-base font-bold text-white shadow-card transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-charcoal">
                Kullanıcı Adı
              </span>
              <input
                required
                type="text"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                placeholder="kullanici_adi"
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Ad
                </span>
                <input
                  required
                  type="text"
                  value={registerFirstName}
                  onChange={(e) => setRegisterFirstName(e.target.value)}
                  placeholder="Ahmet"
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Soyad
                </span>
                <input
                  required
                  type="text"
                  value={registerLastName}
                  onChange={(e) => setRegisterLastName(e.target.value)}
                  placeholder="Yılmaz"
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-charcoal">
                E-posta
              </span>
              <input
                required
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="ornek@eposta.com"
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Şifre
                </span>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Şifre (Tekrar)
                </span>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={registerPasswordConfirm}
                  onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              {/* Checkbox 1 (zorunlu) */}
              <label className="flex items-start gap-2.5 text-sm text-gray-600">
                <input
                  required
                  type="checkbox"
                  checked={acceptedPrivacy && acceptedTerms}
                  onChange={(e) => handleConsentChange(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/30"
                />
                <span>
                  <button
                    type="button"
                    onClick={() => openLegalDoc("uyelik-sozlesmesi")}
                    className="font-bold text-[#FF5000] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Üyelik Sözleşmesi&apos;ni
                  </button>{" "}
                  ve{" "}
                  <button
                    type="button"
                    onClick={() => openLegalDoc("kvkk")}
                    className="font-bold text-[#FF5000] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    KVKK Aydınlatma Metni&apos;ni
                  </button>{" "}
                  okudum, anladım ve kabul ediyorum.
                </span>
              </label>

              {/* Checkbox 2 (opsiyonel) */}
              <label className="flex items-start gap-2.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={acceptsMarketing}
                  onChange={(e) => setAcceptsMarketing(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/30"
                />
                <span>
                  Kişisel verilerimin{" "}
                  <button
                    type="button"
                    onClick={() => openLegalDoc("acik-riza-beyani")}
                    className="font-bold text-[#FF5000] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Açık Rıza Beyanı
                  </button>{" "}
                  kapsamında işlenmesini ve tarafıma kampanya duyuruları gönderilmesini kabul
                  ediyorum.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!acceptedPrivacy || !acceptedTerms || isSubmitting}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF5000] py-3.5 text-base font-bold text-white shadow-card transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#FF5000]"
            >
              {isSubmitting ? "Kayıt Oluşturuluyor..." : "Kayıt Ol"}
            </button>
          </form>
        )}
      </div>

      {activeLegalDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={legalDocContent?.title ?? registerLegalDocFallbackTitles[activeLegalDoc]}
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-popover">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-6 py-4">
              <h3 className="font-heading text-lg font-bold text-charcoal">
                {legalDocContent?.title ?? registerLegalDocFallbackTitles[activeLegalDoc]}
              </h3>
              <button
                type="button"
                onClick={closeLegalDoc}
                aria-label="Kapat"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-offwhite hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoadingLegalDoc ? (
                <div className="flex min-h-[20vh] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : legalDocError ? (
                <p className="text-sm text-muted">{legalDocError}</p>
              ) : (
                <div
                  className="text-sm leading-relaxed text-gray-600 [&_p]:mb-3 [&_p]:last:mb-0"
                  dangerouslySetInnerHTML={{ __html: legalDocContent?.content_html ?? "" }}
                />
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={closeLegalDoc}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5000] py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Okudum, Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
