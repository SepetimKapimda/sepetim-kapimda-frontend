"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Logo from "@/components/Logo";

// Not: Bu route bilinçli olarak `(courier)` route group'unun DIŞINDA
// tutulur — aksi halde `(courier)/layout.tsx`'teki auth-guard, henüz
// giriş yapmamış (unauthenticated) kuryeyi bu sayfadan da uzaklaştırırdı.
export default function CourierGirisPage() {
  const router = useRouter();
  const loginCourier = useAuthStore((state) => state.loginCourier);
  const authError = useAuthStore((state) => state.authError);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await loginCourier(username, password);
      router.replace("/kurye/panel");
    } catch {
      // Hata mesajı authError üzerinden formda gösteriliyor.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-6 shadow-card md:p-8">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-16 w-16" />
          <h1 className="font-heading text-xl font-black text-charcoal">
            Kurye Portalı
          </h1>
          <p className="mt-1.5 text-sm text-muted">Devam etmek için giriş yapın</p>
        </div>

        {authError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="courier-username" className="mb-1.5 block text-sm font-medium text-muted">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="courier-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="courier-password" className="mb-1.5 block text-sm font-medium text-muted">
              Şifre
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="courier-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}
