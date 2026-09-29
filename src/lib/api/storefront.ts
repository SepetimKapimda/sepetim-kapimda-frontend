import { apiClient } from "@/lib/apiClient";

// FRONTEND_CHANGES.md §7.3 — herkese açık, oturum gerekmez.
export interface StorefrontInfo {
  store_name: string;
  description: string;
  opening_time: string;
  closing_time: string;
  is_temporarily_closed: boolean;
  is_open: boolean;
  status_message: string;
  min_order_amount: string;
  hero_banner_image: string | null;
  mobile_hero_banner_image: string | null;
  promo_sidebar_image: string | null;
}

// Anasayfa Server Component'inde SSR sırasında da çağrılır — Vercel'in tek
// sunucu IP'sinden backend'i sürekli dövmemek için ISR ile 60 saniye
// önbelleklenir (client tarafındaki çağrılarda bu alan zararsızca yok sayılır).
export function fetchStorefront(): Promise<StorefrontInfo> {
  return apiClient.get<StorefrontInfo>("/api/markets/storefront/", {
    next: { revalidate: 60 },
  });
}
