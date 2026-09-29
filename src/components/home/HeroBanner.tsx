"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { StorefrontInfo } from "@/lib/api/storefront";
import type { ActiveBanner } from "@/lib/api/banners";
import { isSupabaseUrl } from "@/lib/resolveMediaUrl";

const AUTO_ROTATE_MS = 6000;

interface HeroBannerProps {
  storefront: StorefrontInfo | null;
  banners: ActiveBanner[];
}

export default function HeroBanner({ storefront, banners }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(intervalId);
  }, [banners.length]);

  // Admin panelinden aktif afiş girilmemişse markanın kendi vitrin görseline düş.
  if (banners.length === 0) {
    const bannerImage = storefront?.hero_banner_image || "https://placehold.co/1200x400.png";
    const mobileBannerImage = storefront?.mobile_hero_banner_image || bannerImage;

    return (
      <section className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-card sm:rounded-3xl md:aspect-[21/9]">
        <Image
          src={mobileBannerImage}
          alt="Sepetim Kapımda kampanya banner'ı"
          fill
          priority
          sizes="100vw"
          unoptimized={isSupabaseUrl(mobileBannerImage)}
          className="block object-cover md:hidden"
        />
        <Image
          src={bannerImage}
          alt="Sepetim Kapımda kampanya banner'ı"
          fill
          priority
          sizes="100vw"
          unoptimized={isSupabaseUrl(bannerImage)}
          className="hidden object-cover md:block"
        />

        <Link
          href="/arama"
          className="group absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2.5 text-xs font-bold text-white shadow-popover ring-2 ring-white/40 transition hover:-translate-y-0.5 hover:bg-charcoal hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:translate-y-0 sm:bottom-8 sm:left-8 sm:px-6 sm:py-3.5 sm:text-sm md:text-base"
        >
          Şimdi Sipariş Ver
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </Link>
      </section>
    );
  }

  const banner = banners[activeIndex];
  // Mobil için ayrı bir kırpma/kompozisyon yüklenmemişse masaüstü görseline düş.
  const mobileImage = banner.mobile_image || banner.image;
  const bannerContent = (
    <>
      <Image
        src={mobileImage}
        alt={banner.title ?? "Sepetim Kapımda kampanya banner'ı"}
        fill
        priority
        sizes="100vw"
        unoptimized={isSupabaseUrl(mobileImage)}
        className="block object-cover md:hidden"
      />
      <Image
        src={banner.image}
        alt={banner.title ?? "Sepetim Kapımda kampanya banner'ı"}
        fill
        priority
        sizes="100vw"
        unoptimized={isSupabaseUrl(banner.image)}
        className="hidden object-cover md:block"
      />

      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 sm:p-8">
          {banner.title && (
            <h2 className="font-heading text-lg font-black text-white sm:text-2xl">{banner.title}</h2>
          )}
          {banner.subtitle && <p className="mt-1 text-xs text-white/90 sm:text-sm">{banner.subtitle}</p>}
        </div>
      )}

      {banner.button_text && (
        <span className="group absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2.5 text-xs font-bold text-white shadow-popover ring-2 ring-white/40 transition hover:-translate-y-0.5 hover:bg-charcoal hover:shadow-card sm:bottom-8 sm:left-8 sm:px-6 sm:py-3.5 sm:text-sm md:text-base">
          {banner.button_text}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      )}
    </>
  );

  return (
    <section className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-card sm:rounded-3xl md:aspect-[21/9]">
      {banner.link ? (
        <Link href={banner.link} className="group absolute inset-0">
          {bannerContent}
        </Link>
      ) : (
        <div className="absolute inset-0">{bannerContent}</div>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-2 right-4 z-20 flex items-center gap-1.5 sm:bottom-4 sm:right-8">
          {banners.map((b, index) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`${index + 1}. afişi göster`}
              aria-current={index === activeIndex}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
