import { apiClient } from "@/lib/apiClient";

// schema.yaml StoreContactSetting — GET /api/core/settings/, herkese açık
// (anonim müşteri dahil, oturum gerekmez). Footer/iletişim bilgileri ve admin
// panelinden yüklenen marka görselleri (`logo_url`/`favicon_url`, hiç
// yüklenmemişse null — frontend statik varsayılanı kullanır).
export interface PublicStoreSettings {
  site_name: string;
  contact_email: string;
  branch_1_phone: string | null;
  branch_2_phone: string | null;
  whatsapp_line: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  logo_url: string | null;
  favicon_url: string | null;
}

export function fetchPublicStoreSettings(): Promise<PublicStoreSettings> {
  return apiClient.get<PublicStoreSettings>("/api/core/settings/");
}
