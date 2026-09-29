import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

export type NotificationEventType = "NEW_ORDER" | "ASSIGNED" | "ON_THE_WAY" | "WAITING_COURIER";
export type NotificationChannel = "TELEGRAM" | "EMAIL";

export interface NotificationTemplatePlaceholder {
  name: string;
  description: string;
}

// schema.yaml NotificationTemplate — olay ve kanal sabit; sadece metin (e-postada
// ayrıca konu) düzenlenebilir. Telegram şablonlarında kişisel veri değişkeni yoktur (KVKK).
export interface NotificationTemplate {
  id: number;
  event_type: NotificationEventType;
  event_type_display: string;
  channel: NotificationChannel;
  channel_display: string;
  recipients: string;
  subject: string;
  template_text: string;
  available_placeholders: NotificationTemplatePlaceholder[];
  updated_at: string;
}

export async function fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
  const data = await apiClient.get<PaginatedResponse<NotificationTemplate>>(
    "/api/admin/notification-templates/?page_size=50"
  );
  return data.results;
}

export interface UpdateNotificationTemplatePayload {
  template_text: string;
}

export function updateNotificationTemplate(
  templateId: number,
  payload: UpdateNotificationTemplatePayload
): Promise<NotificationTemplate> {
  return apiClient.patch<NotificationTemplate>(
    `/api/admin/notification-templates/${templateId}/`,
    payload
  );
}
