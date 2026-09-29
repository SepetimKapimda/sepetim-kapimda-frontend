"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Settings,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { href: "/admin/panel", label: "Genel Bakış", icon: LayoutDashboard, comingSoon: false },
  { href: "/admin/siparisler", label: "Siparişler", icon: ListOrdered, comingSoon: false },
  { href: "/admin/kullanicilar", label: "Kullanıcı & Personel", icon: Users, comingSoon: false },
  { href: "/admin/finans", label: "Sistem Finansı", icon: Wallet, comingSoon: false },
  { href: "/admin/pazarlama", label: "Pazarlama & Kuponlar", icon: Megaphone, comingSoon: false },
  { href: "/admin/taslaklar", label: "İletişim Taslakları", icon: MessageSquareText, comingSoon: false },
  { href: "/admin/ayarlar", label: "Platform Ayarları", icon: Settings, comingSoon: false },
  { href: "/admin/site-icerigi", label: "Site İçeriği & Sözleşmeler", icon: FileText, comingSoon: false },
  { href: "/admin/hesap-ayarlari", label: "Hesap Ayarları", icon: UserCog, comingSoon: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const role = useAuthStore((state) => state.user?.role);
  const username = useAuthStore((state) => state.user?.username);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // `AuthBootstrap` localStorage'daki token'dan oturumu geri yüklerken
    // (`isBootstrapping`) henüz "giriş yapılmamış" kararı verilmez — aksi
    // halde geçerli bir oturumu olan admin her sayfa yenilemesinde
    // `/admin/giris`'e atılırdı. `/admin/giris` bilinçli olarak bu route
    // group'un DIŞINDA tutulur — aksi halde bu guard, henüz giriş yapmamış
    // sistem yöneticisini login formunu göremeden sürekli kendine geri atardı.
    if (isBootstrapping) return;
    if (!isAuthenticated || role !== "ADMIN") {
      router.replace("/admin/giris");
    }
  }, [isBootstrapping, isAuthenticated, role, router]);

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

  if (!isAuthenticated || role !== "ADMIN") {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.replace("/admin/giris");
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2.5 border-b border-white/10 px-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white p-2">
              <Logo className="h-8 w-auto" />
            </div>
            <span className="font-heading text-sm font-bold text-white">Admin Paneli</span>
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

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/30">
            Sepetim Kapımda Q-Commerce
          </p>
        </div>
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

          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
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
