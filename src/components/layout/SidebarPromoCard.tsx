"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fetchStorefront } from "@/lib/api/storefront";
import { isSupabaseUrl } from "@/lib/resolveMediaUrl";

export default function SidebarPromoCard() {
  const [promoImage, setPromoImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchStorefront()
      .then((data) => {
        if (isMounted) setPromoImage(data.promo_sidebar_image);
      })
      .catch(() => {
        // Vitrin bilgisi alınamadı — aşağıdaki placeholder görsel kullanılmaya devam eder.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative mx-3 mt-4 aspect-[4/5] overflow-hidden rounded-2xl shadow-soft">
      {/* Kampanya görseli market ayarlarından (`promo_sidebar_image`) gelir; henüz yüklenmemişse placeholder gösterilir. */}
      <Image
        src={promoImage || "https://placehold.co/300x375.png"}
        alt="Sepetim Kapımda kampanya görseli"
        fill
        sizes="288px"
        unoptimized={isSupabaseUrl(promoImage ?? "")}
        className="object-cover"
      />

      <Link
        href="/arama"
        className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg bg-charcoal px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-black hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/50 focus-visible:ring-offset-1 active:translate-y-0"
      >
        Alışverişe Başla
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
