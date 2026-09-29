"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  History,
  Loader2,
  LogOut,
  Menu,
  Package,
  Radio,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMarketStore } from "@/store/useMarketStore";
import Logo from "@/components/Logo";

const navItems = [
  { href: "/vendor/panel", label: "Canlı Siparişler", icon: Radio, comingSoon: false },
  { href: "/vendor/urunler", label: "Ürün Yönetimi", icon: Package, comingSoon: false },
  { href: "/vendor/siparisler", label: "Geçmiş Siparişler", icon: History, comingSoon: false },
  { href: "/vendor/finans", label: "Finans & Hakediş", icon: Wallet, comingSoon: false },
  { href: "/vendor/ayarlar", label: "Ayarlar", icon: Settings, comingSoon: false },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const role = useAuthStore((state) => state.user?.role);
  const username = useAuthStore((state) => state.user?.username);
  const logout = useAuthStore((state) => state.logout);
  const openingTime = useMarketStore((state) => state.openingTime);
  const closingTime = useMarketStore((state) => state.closingTime);
  const isTemporarilyClosed = useMarketStore((state) => state.isTemporarilyClosed);
  const fetchSettings = useMarketStore((state) => state.fetchSettings);
  const router = useRouter();
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasNewOrderNotification, setHasNewOrderNotification] = useState(true);

  useEffect(() => {
    // `AuthBootstrap` oturumu token'dan geri yüklerken (`isBootstrapping`)
    // henüz "giriş yapılmamış" kararı verilmez — aksi halde geçerli bir
    // oturumu olan market sahibi her sayfa yenilemesinde `/vendor/giris`'e
    // atılırdı. `/vendor/giris` bilinçli olarak bu route group'un DIŞINDA
    // tutulur — aksi halde bu guard, henüz giriş yapmamış market sahibini
    // login formunu göremeden sürekli kendine geri atardı.
    if (isBootstrapping) return;
    if (!isAuthenticated || role !== "MARKET_OWNER") {
      router.replace("/vendor/giris");
    }
  }, [isBootstrapping, isAuthenticated, role, router]);

  useEffect(() => {
    if (isAuthenticated && role === "MARKET_OWNER") {
      fetchSettings().catch(() => {
        // Sessizce yok say — üstteki mesai rozeti varsayılan değerlerle kalır.
      });
    }
  }, [isAuthenticated, role, fetchSettings]);

  // Sayfa (route) değiştiğinde mobilde açık kalan off-canvas menüyü kapat.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-offwhite">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated || role !== "MARKET_OWNER") {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.replace("/vendor/giris");
  };

  return (
    <div className="min-h-screen bg-offwhite">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-charcoal transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2.5 border-b border-white/10 px-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white p-2">
              <Logo className="h-8 w-auto" />
            </div>
            <span className="font-heading text-sm font-bold text-white">Market Paneli</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Menüyü Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon, comingSoon }) => {
            const isActive = pathname === href;

            if (comingSoon) {
              return (
                <div
                  key={href}
                  className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white/30"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/40">
                    Yakında
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-orange-500 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Menüyü Aç"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-muted">Hoş geldin,</p>
              <p className="truncate font-heading text-sm font-bold text-charcoal">{username}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span
              className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold sm:flex ${
                isTemporarilyClosed
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-orange-200 bg-orange-50 text-orange-700"
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Mesai: {openingTime} - {closingTime}
              {isTemporarilyClosed ? " (Geçici Kapalı)" : ""}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1.5 text-xs font-bold sm:hidden ${
                isTemporarilyClosed
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-orange-200 bg-orange-50 text-orange-700"
              }`}
            >
              {isTemporarilyClosed ? "KAPALI" : "AÇIK"}
            </span>

            <button
              type="button"
              onClick={() => setHasNewOrderNotification(false)}
              aria-label={
                hasNewOrderNotification
                  ? "Bildirimler (yeni sipariş var)"
                  : "Bildirimler"
              }
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
            >
              <Bell className="h-5 w-5" />
              {hasNewOrderNotification && (
                <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
