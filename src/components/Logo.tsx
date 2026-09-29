"use client";

import Image from "next/image";
import { useBrandingStore } from "@/store/useBrandingStore";

interface LogoProps {
  className?: string;
}

// Tüm panellerde (Admin, Market, Kurye, Müşteri) tutarlı marka kimliği için
// tek noktadan yönetilen logo bileşeni. Admin panelinden bir logo yüklendiyse
// (bkz. `useBrandingStore` — backend'in gerçek `logo_url`'ini önbellekler)
// onu, aksi halde `public/logo.png` statik varsayılanını gösterir.
export default function Logo({ className = "h-10 w-10" }: LogoProps) {
  const logoUrl = useBrandingStore((state) => state.logoUrl);

  return (
    <Image
      src={logoUrl || "/logo.png"}
      alt="Sepetim Kapımda"
      width={200}
      height={200}
      priority
      unoptimized={!!logoUrl}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
