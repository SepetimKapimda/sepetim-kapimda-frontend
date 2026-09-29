"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { fetchPages, type DynamicPageListItem } from "@/lib/api/pages";

export default function Footer() {
  // BottomActionBanner sadece anasayfada `fixed bottom-0` olarak görünür;
  // footer'ın alt kısmının onun altında kalmaması için sadece "/" rotasında
  // ekstra alt boşluk ekliyoruz.
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Kurumsal sayfaların (Hakkımızda, SSS, KVKK vb.) tek kaynağı Django Admin —
  // footer ve kurumsal navigasyon menüsü aynı listeyi (`/api/pages/`) kullanır.
  const [pages, setPages] = useState<DynamicPageListItem[]>([]);

  useEffect(() => {
    fetchPages()
      .then(setPages)
      .catch(() => setPages([]));
  }, []);

  const footerLinks = pages.map((page) => ({
    label: page.title,
    href: `/sayfa/${page.slug}`,
  }));

  return (
    <footer
      className={`mt-12 w-full border-t border-gray-100 bg-white ${
        isHome ? "pb-24 lg:pb-28" : ""
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1536px] flex-col items-center gap-8 px-4 py-10 lg:px-8 lg:py-12">
        <Link href="/" className="flex shrink-0 items-center">
          <Logo className="h-32 w-32 object-contain sm:h-40 sm:w-40" />
        </Link>

        {footerLinks.length > 0 && (
          <nav
            aria-label="Alt bilgi bağlantıları"
            className="grid w-full max-w-2xl grid-cols-2 gap-x-8 gap-y-3 text-center text-sm font-medium leading-loose text-muted sm:grid-cols-3"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <p className="w-full border-t border-gray-100 pt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} Sepetim Kapımda. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
