import Link from "next/link";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Zap } from "lucide-react";
import { mockBottomBannerFeatures } from "@/lib/mockData";

// Duplicated once so the track can loop seamlessly: at -50% translateX the
// second copy sits exactly where the first started, so the reset is invisible.
const marqueeItems = [...mockBottomBannerFeatures, ...mockBottomBannerFeatures];

export default function BottomActionBanner() {
  return (
    <section className="fixed bottom-0 left-1/2 z-50 w-full max-w-[1536px] -translate-x-1/2 overflow-hidden bg-[#FF5000] shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]">
      <div className="mx-auto flex w-full max-w-[1536px] flex-row items-center justify-between gap-4 px-4 py-3 md:gap-6 md:py-4 lg:gap-10 lg:px-8">
        {/* Headline — always visible, left corner */}
        <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
          <Zap className="h-7 w-7 flex-shrink-0 fill-secondary text-secondary md:h-11 md:w-11" />
          <div className="flex flex-col whitespace-nowrap">
            <span className="hidden text-[10px] font-semibold italic uppercase tracking-wide text-white/90 sm:block md:text-xs">
              Tüm İhtiyaçların İçin
            </span>
            <span className="font-heading text-base font-black italic uppercase leading-none text-white md:text-xl lg:text-2xl">
              Tek Tıkla!
            </span>
          </div>
        </div>

        {/* Scrolling middle: infinite marquee of feature highlights — desktop only */}
        <div
          className="relative hidden min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] md:block"
          role="marquee"
          aria-label="Sepetim Kapımda avantajları"
        >
          <div className="flex w-max animate-marquee items-center gap-6 hover:[animation-play-state:paused] md:gap-0 md:divide-x md:divide-white/20">
            {marqueeItems.map((feature, index) => {
              const Icon = (Icons[feature.icon as keyof typeof Icons] ??
                Icons.Sparkles) as LucideIcon;

              return (
                <div
                  key={`${feature.id}-${index}`}
                  className="flex flex-shrink-0 items-center gap-3 whitespace-nowrap md:px-8"
                  aria-hidden={index >= mockBottomBannerFeatures.length}
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex flex-shrink-0 flex-col whitespace-nowrap">
                    <span className="text-sm font-bold text-white">
                      {feature.title}
                    </span>
                    <span className="text-xs text-white/80">
                      {feature.description}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA — always visible, right corner */}
        <Link
          href="/arama"
          className="inline-flex flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-charcoal px-3 py-2 text-xs font-bold text-white shadow-popover transition hover:-translate-y-0.5 hover:bg-black hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:translate-y-0 sm:gap-2 sm:text-sm md:px-6 md:py-3"
        >
          Alışverişe Başla
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
