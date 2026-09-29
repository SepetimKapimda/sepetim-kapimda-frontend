import { apiClient } from "@/lib/apiClient";

// schema.yaml TelegramSettings — tüm roller için ortak. Kullanıcı botun
// `/start` komutuna yazdıktan sonra aldığı sohbet kimliğini kaydeder; boş
// gönderilirse Telegram bildirimleri kapanır.
export interface TelegramSettings {
  telegram_chat_id: string | null;
}

export function fetchTelegramSettings(): Promise<TelegramSettings> {
  return apiClient.get<TelegramSettings>("/api/users/me/telegram-settings/");
}

export function updateTelegramSettings(chatId: string | null): Promise<TelegramSettings> {
  // Backend `^(-?\d{1,20}|@[A-Za-z0-9_]{5,32})$` deseniyle doğrular; kopyala-
  // yapıştırdan gelebilecek baştaki/sondaki boşluk bu deseni kırıp gereksiz
  // bir 400'e yol açmasın diye burada temizleniyor.
  const trimmed = chatId?.trim() || null;
  return apiClient.patch<TelegramSettings>("/api/users/me/telegram-settings/", {
    telegram_chat_id: trimmed,
  });
}
