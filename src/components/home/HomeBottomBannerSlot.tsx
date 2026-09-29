"use client";

import { usePathname } from "next/navigation";
import BottomActionBanner from "./BottomActionBanner";

/**
 * BottomActionBanner must live outside the Sidebar+main flex row (in
 * layout.tsx) so it can span the true viewport width, but it should only ever
 * appear on the homepage, right below the deal products grid. This slot
 * renders it conditionally based on the current route.
 */
export default function HomeBottomBannerSlot() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return <BottomActionBanner />;
}
