// Django backend'in kök adresi. `next.config.mjs`'teki `images.remotePatterns`
// da aynı env değişkenini okur (config dosyası src/ dışında olduğu için bu
// sabiti import edemez, ikisi manuel senkron tutulmalı).
// Not: "localhost" değil "127.0.0.1" — Node'un fetch'i (undici) localhost'u
// önce IPv6 (::1) olarak çözüyor; Django varsayılan olarak sadece IPv4'te
// dinlediği için bu, tarayıcıda/curl'de çalışıp sunucu tarafı fetch'te
// ECONNREFUSED ::1:8000 ile patlayan bir hataya yol açıyordu.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export function getWebSocketBaseUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws");
}
