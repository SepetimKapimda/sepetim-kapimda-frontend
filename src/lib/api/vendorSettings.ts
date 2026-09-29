import { apiClient } from "@/lib/apiClient";

// schema.yaml MarketSettings
export interface MarketSettings {
  store_name: string;
  description: string;
  opening_time: string;
  closing_time: string;
  is_temporarily_closed: boolean;
  min_order_amount: string;
  hero_banner_image: string | null;
  promo_sidebar_image: string | null;
}

export function fetchMarketSettings(): Promise<MarketSettings> {
  return apiClient.get<MarketSettings>("/api/markets/settings/");
}

export interface UpdateMarketSettingsPayload {
  store_name?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  is_temporarily_closed?: boolean;
  min_order_amount?: string;
  /** Yeni dosya, kaldırmak için "" (boş string), değiştirmemek için hiç gönderme. */
  hero_banner_image?: File | "";
  promo_sidebar_image?: File | "";
}

export function updateMarketSettings(
  payload: UpdateMarketSettingsPayload
): Promise<MarketSettings> {
  const hasFile =
    payload.hero_banner_image instanceof File || payload.promo_sidebar_image instanceof File;

  if (!hasFile) {
    const { hero_banner_image, promo_sidebar_image, ...rest } = payload;
    const body: Record<string, unknown> = { ...rest };
    if (hero_banner_image === "") body.hero_banner_image = "";
    if (promo_sidebar_image === "") body.promo_sidebar_image = "";
    return apiClient.patch<MarketSettings>("/api/markets/settings/", body);
  }

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    formData.append(key, value instanceof File ? value : String(value));
  });
  return apiClient.patch<MarketSettings>("/api/markets/settings/", formData);
}
