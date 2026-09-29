import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { mockFeatures } from "@/lib/mockData";

const marqueeItems = [...mockFeatures, ...mockFeatures];

export default function FeatureBar() {
  return (
    <section className="relative w-full overflow-hidden rounded-2xl border border-gray-100 bg-white py-5 shadow-soft [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] md:py-4">
      <div className="flex w-max animate-marquee flex-row items-center whitespace-nowrap hover:[animation-play-state:paused]">
        {marqueeItems.map((feature, index) => {
          const Icon = (Icons[feature.icon as keyof typeof Icons] ??
            Icons.Sparkles) as LucideIcon;

          return (
            <div
              key={`${feature.id}-${index}`}
              className="flex shrink-0 items-center gap-3 px-8"
            >
              <Icon className="h-8 w-8 shrink-0 text-primary" />
              <span className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 md:text-base">
                  {feature.title}
                </span>
                <span className="text-xs text-gray-500 md:text-sm">
                  {feature.description}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
