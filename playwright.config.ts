import { defineConfig, devices } from "@playwright/test";

// Not: backend (127.0.0.1:8000) ve frontend (localhost:3000) testten önce
// elle ayağa kaldırılmış olmalı — burada bilinçli olarak bir `webServer`
// tanımlanmadı, aksi halde zaten çalışan dev sunucusuyla port çakışması olur.
//
// workers: 1 — bu süit birbirinden İZOLE bir ortam değil, TEK bir gerçek
// paylaşılan backend'e (gerçek seed hesapları, gerçek DRF hız sınırları,
// gerçek sipariş/adres verisi) karşı çalışıyor. Varsayılan çoklu worker,
// farklı dosyaların aynı anda aynı hesaplara giriş yapmasına (bkz.
// "auth_attempt" hız sınırı) ve tek bir dev sunucusunun eşzamanlı 5 tarayıcı
// oturumu altında yavaşlayıp zaman aşımına düşmesine yol açıyor — bunlar
// gerçek bir ürün kusuru değil, bu mimariyle paralel çalıştırmanın doğal
// sonucu. Seri çalıştırma bu süit için doğru ve kararlı varsayılandır.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
