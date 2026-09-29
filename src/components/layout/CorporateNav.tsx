"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Cookie,
  FileCheck,
  FileText,
  Info,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { MANAGED_PAGE_SLUGS, MANAGED_PAGE_TITLES, type ManagedPageSlug } from "@/lib/api/managedPages";

const PAGE_ICONS: Record<ManagedPageSlug, LucideIcon> = {
  "mesafeli-satis-sozlesmesi": FileText,
  "uyelik-sozlesmesi": FileText,
  "kvkk-aydinlatma-metni": ShieldCheck,
  "cerez-politikasi": Cookie,
  "on-bilgilendirme-formu": Info,
  "acik-riza-beyani": FileCheck,
  hakkimizda: Building2,
  iletisim: Phone,
};

// Kurumsal/hukuki sayfaların (Hakkımızda, İletişim, KVKK, sözleşmeler vb.)
// ortak "Getir tarzı" yan menüsü — sabit 8 sayfa listesi doğrudan
// `managedPages.ts`'den gelir (ağ isteği gerekmez), bu yüzden henüz hiç
// içerik girilmemiş bir sayfa bile menüde her zaman görünür.
export default function CorporateNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Kurumsal sayfalar" className="lg:w-64 lg:shrink-0">
      {/* Mobil/tablet: üstte yatay kaydırılabilir hap (pill) menü */}
      <div className="-mx-4 mb-6 overflow-x-auto px-4 pb-1 lg:hidden">
        <div className="flex w-max gap-2">
          {MANAGED_PAGE_SLUGS.map((slug) => {
            const href = `/sayfa/${slug}`;
            const isActive = pathname === href;
            return (
              <Link
                key={slug}
                href={href}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-primary text-white shadow-soft"
                    : "bg-gray-100 text-muted hover:bg-gray-200"
                }`}
              >
                {MANAGED_PAGE_TITLES[slug]}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Masaüstü: ikonlu, dikey link listesi */}
      <div
        data-testid="corporate-nav-desktop"
        className="hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-soft lg:sticky lg:top-24 lg:block"
      >
        <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-muted">
          Kurumsal
        </p>
        <div className="flex flex-col gap-1">
          {MANAGED_PAGE_SLUGS.map((slug) => {
            const href = `/sayfa/${slug}`;
            const isActive = pathname === href;
            const Icon = PAGE_ICONS[slug];
            return (
              <Link
                key={slug}
                href={href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-charcoal hover:bg-offwhite"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted"}`} />
                {MANAGED_PAGE_TITLES[slug]}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
