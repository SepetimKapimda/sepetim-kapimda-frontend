"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { href: "/yonetici/panel", label: "Dashboard", icon: LayoutDashboard, comingSoon: false },
  { href: "/yonetici/atama", label: "Aktif Saha Operasyonu", icon: ClipboardList, comingSoon: false },
  { href: "/yonetici/siparisler", label: "Tüm Siparişler", icon: ListOrdered, comingSoon: false },
  { href: "/yonetici/kuryeler", label: "Kurye Listesi", icon: Users, comingSoon: false },
  { href: "/yonetici/finans", label: "Finans & Ödenekler", icon: Wallet, comingSoon: false },
  { href: "/yonetici/hesabim", label: "Hesap Ayarları", icon: Settings, comingSoon: false },
];

export default function CourierManagerLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const role = useAuthStore((state) => state.user?.role);
  const username = useAuthStore((state) => state.user?.username);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // `AuthBootstrap` oturumu token'dan geri yüklerken (`isBootstrapping`)
    // henüz "giriş yapılmamış" kararı verilmez — aksi halde geçerli bir
    // oturumu olan yönetici her sayfa yenilemesinde `/yonetici/giris`'e
    // atılırdı. `/yonetici/giris` bilinçli olarak bu route group'un DIŞINDA
    // tutulur — aksi halde bu guard, henüz giriş yapmamış yöneticiyi login
    // formunu göremeden sürekli kendine geri atardı.
    if (isBootstrapping) return;
    if (!isAuthenticated || role !== "COURIER_MANAGER") {
      router.replace("/yonetici/giris");
    }
  }, [isBootstrapping, isAuthenticated, role, router]);

  // Sayfa (route) değiştiğinde mobilde açık kalan off-canvas menüyü kapat.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-offwhite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || role !== "COURIER_MANAGER") {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.replace("/yonetici/giris");
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
            <span className="font-heading text-sm font-bold text-white">Kurye Yönetimi</span>
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
                    ? "bg-primary text-white"
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-muted">Hoş geldin,</p>
              <p className="truncate font-heading text-sm font-bold text-charcoal">{username}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
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
