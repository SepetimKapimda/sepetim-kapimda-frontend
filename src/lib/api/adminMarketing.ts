import { apiClient } from "@/lib/apiClient";

// schema.yaml BulkEmail / BulkEmailResponse — `POST /api/admin/bulk-email/`
// kampanya e-postası iznini vermiş (`is_marketing_accepted`) TÜM aktif
// müşterilere adminin yazdığı konu/içerikle düz metin e-posta gönderir.
// Gönderim arka planda yapılır, yanıt hemen 202 döner. Sonuna kampanya
// iznini geri çekme bilgisi otomatik eklenir. Uygun alıcı yoksa 400,
// önceki gönderim hâlâ sürüyorsa 409 döner (apiClient bunları ApiError
// olarak fırlatır).
export interface BulkEmailPayload {
  subject: string;
  message: string;
}

export interface BulkEmailResponse {
  message: string;
  recipient_count: number;
}

export function sendBulkEmail(payload: BulkEmailPayload): Promise<BulkEmailResponse> {
  return apiClient.post<BulkEmailResponse>("/api/admin/bulk-email/", payload);
}
