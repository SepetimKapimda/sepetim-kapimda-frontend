import { apiClient } from "@/lib/apiClient";

// schema.yaml AdminStoreSetting — iletişim bilgileri, finans oranları, ana şalter,
// marka varlıkları (logo/favicon) ve (veritabanında şifreli, yanıtta maskeli
// dönen) entegrasyon anahtarları.
export interface AdminStoreSetting {
  site_name: string;
  contact_email: string;
  branch_1_phone: string | null;
  branch_2_phone: string | null;
  whatsapp_line: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  /** Yüzde: "20.00" = %20 */
  markup_rate: string;
  /** Brüt kâr havuzundan admin payı, yüzde (kalanı Kurye Yöneticisinin) */
  admin_profit_share: string;
  /** Kurye paket başı ücreti (TL) */
  courier_base_fee: string;
  is_ordering_open: boolean;
  /** Maskeli döner (Örn: re_********cdef); `***` içeren değer gönderilirse değişmez. */
  resend_api_key: string | null;
  telegram_bot_token: string | null;
  logo_url: string | null;
  favicon_url: string | null;
}

export function fetchAdminSettings(): Promise<AdminStoreSetting> {
  return apiClient.get<AdminStoreSetting>("/api/admin/settings/");
}

export interface AdminSettingsWritePayload
  extends Partial<Omit<AdminStoreSetting, "logo_url" | "favicon_url">> {
  /** XSS riski nedeniyle backend `image/svg+xml` yüklemelerini 400 ile reddeder. */
  logo?: File;
  favicon?: File;
}

function toSettingsFormData(payload: AdminSettingsWritePayload): FormData {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      formData.append(key, "");
      return;
    }
    formData.append(key, value instanceof File ? value : String(value));
  });
  return formData;
}

export function updateAdminSettings(
  payload: AdminSettingsWritePayload
): Promise<AdminStoreSetting> {
  if (!(payload.logo instanceof File) && !(payload.favicon instanceof File)) {
    return apiClient.patch<AdminStoreSetting>("/api/admin/settings/", payload);
  }
  return apiClient.patch<AdminStoreSetting>("/api/admin/settings/", toSettingsFormData(payload));
}
