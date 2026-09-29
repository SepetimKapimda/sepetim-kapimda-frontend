"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Menu, Package, Settings, Wallet, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";

const drawerNavItems = [
  { href: "/kurye/panel", label: "Görevler", icon: Package },
  { href: "/kurye/cuzdan", label: "Cüzdan", icon: Wallet },
  { href: "/kurye/ayarlar", label: "Ayarlar", icon: Settings },
];

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const role = useAuthStore((state) => state.user?.role);
  const router = useRouter();
  const pathname = usePathname();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    // `AuthBootstrap` oturumu token'dan geri yüklerken (`isBootstrapping`)
    // henüz "giriş yapılmamış" kararı verilmez — aksi halde geçerli bir
    // oturumu olan kurye her sayfa yenilemesinde `/kurye/giris`'e atılırdı.
    // `/kurye/giris` bilinçli olarak bu route group'un dışında tutulur, bu
    // yüzden buraya yönlendirmek guard ile "Çıkış Yap" akışını çakıştırmaz.
    if (isBootstrapping) return;
    if (!isAuthenticated || role !== "COURIER") {
      router.replace("/kurye/giris");
    }
  }, [isBootstrapping, isAuthenticated, role, router]);

  // Sayfa (route) değiştiğinde açık kalan drawer'ı kapat.
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-offwhite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || role !== "COURIER") {
    return null;
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Menüyü Aç"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center justify-center">
          <Logo className="h-10 w-auto md:h-12" />
        </div>
        <NotificationBell />
      </header>

      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>{children}</div>

      {/* Karartma overlay'i — drawer açıkken sayfanın geri kalanını hafifçe karartır */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Soldan açılan (Slide-in) mobil menü */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-white shadow-popover transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <Logo className="h-9 w-auto" />
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Menüyü Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-offwhite hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {drawerNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isActive ? "bg-primary/10 text-primary" : "text-charcoal hover:bg-offwhite"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
