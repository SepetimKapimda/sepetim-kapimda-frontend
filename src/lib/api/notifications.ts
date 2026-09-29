import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  order_id: number | null;
  payout_id: number | null;
  product_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created: string;
}

export function fetchNotifications(pageSize = 10): Promise<PaginatedResponse<AppNotification>> {
  return apiClient.get<PaginatedResponse<AppNotification>>(
    `/api/notifications/?page_size=${pageSize}`
  );
}

export function fetchUnreadNotificationCount(): Promise<{ unread_count: number }> {
  return apiClient.get<{ unread_count: number }>("/api/notifications/unread-count/");
}

export function markNotificationRead(id: number): Promise<AppNotification> {
  return apiClient.post<AppNotification>(`/api/notifications/${id}/read/`);
}

export function markAllNotificationsRead(): Promise<{ updated: number; unread_count: number }> {
  return apiClient.post<{ updated: number; unread_count: number }>("/api/notifications/read-all/");
}
