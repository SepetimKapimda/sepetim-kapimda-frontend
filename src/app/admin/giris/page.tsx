"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
import Logo from "@/components/Logo";

// Not: Bu route bilinçli olarak `(admin)` route group'unun DIŞINDA tutulur —
// aksi halde `(admin)/layout.tsx`'teki auth-guard, henüz giriş yapmamış
// sistem yöneticisini bu sayfadan da uzaklaştırırdı.
export default function AdminGirisPage() {
  const router = useRouter();
  const loginAdmin = useAuthStore((state) => state.loginAdmin);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await loginAdmin(username, password);
      router.replace("/admin/panel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş yapılamadı. Lütfen tekrar deneyin.");
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
            Sistem Yöneticisi
          </h1>
          <p className="mt-1.5 text-sm text-muted">Devam etmek için giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="admin-username" className="mb-1.5 block text-sm font-medium text-muted">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-muted">
              Şifre
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
