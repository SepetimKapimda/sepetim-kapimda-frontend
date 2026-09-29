import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

/**
 * Genel UI/UX ve responsive denetimi (QA taraması).
 *
 * Vitrindeki sayfalama bileşeninin mobilde yatay taşmaya (overflow) yol
 * açtığı tespit edildikten sonra, sistemin geri kalanında benzer görsel
 * bozulmalar veya "ölü" (tıklanamaz/erişilemez) butonlar olup olmadığını
 * otomatik olarak taramak için yazıldı. Mobil viewport (iPhone 13 emülasyonu,
 * ~390px genişlik) ile anasayfa, ürün listesi, ürün detayı ve üç panel
 * (admin/vendor/kurye) tek tek gezilip her sayfada şu iki evrensel kontrol
 * uygulanıyor:
 *   a) Yatay taşma: `document.documentElement.scrollWidth` `window.innerWidth`
 *      değerini aşmamalı (aşarsa mobilde yatay kaydırma çubuğu/kayma olur).
 *   b) JS hatası + ölü buton: sayfa yüklenirken hiçbir `pageerror` fırlamamalı
 *      ve görünür buton/linklerin en az bir kısmı gerçekten etkileşilebilir
 *      (visible+enabled, `href="#"` gibi sahte linkler değil) olmalı.
 *
 * Ön koşullar (test kendisi başlatmaz): backend (127.0.0.1:8000) ve frontend
 * (localhost:3000) çalışıyor olmalı; admin/market/kurye hesapları seed
 * edilmiş olmalı (şifre: Test2026!).
 *
 * Bilinen kısıt: Backend giriş uçlarında DRF hız sınırlama (throttling) aktif
 * (bkz. full-lifecycle.spec.ts'teki aynı not). Bu dosyayı diğer E2E
 * testleriyle (özellikle art arda, kısa aralıklarla) birlikte çalıştırmak
 * admin/market/kurye girişlerinin "Üst üste çok fazla istek yapıldı" hatasıyla
 * sahte biçimde başarısız olmasına yol açabilir — birkaç saniye bekleyip
 * tekrar deneyin veya bu dosyayı tek başına çalıştırın.
 */

// `devices["iPhone 13"]` WebKit motorunu zorunlu kılıyor (bu projede sadece
// Chromium kurulu) — bu yüzden gerçek bir mobil cihazı (375px genişlik,
// dokunmatik) Chromium üzerinde emüle etmek için alanlar elle ayarlandı.
test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

const PASSWORD = "Test2026!";
const ADMIN = { username: "admin@sanalmarket.test", password: PASSWORD };
const MARKET = { username: "market@sanalmarket.test", password: PASSWORD };
const COURIER = { username: "kurye1@sanalmarket.test", password: PASSWORD };
const BACKEND_URL = "http://127.0.0.1:8000";

test.setTimeout(60_000);

async function fetchAnyActiveProductSlug(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${BACKEND_URL}/api/products/?page_size=1`);
  const body = await res.json();
  const slug = body.results?.[0]?.slug;
  expect(slug, "Denetim için canlı bir ürün bulunamadı — en az bir aktif ürün seed edilmiş olmalı").toBeTruthy();
  return slug as string;
}

// Sayfa yüklenirken/etkileşim sırasında JS hatası fırlamamalı; her rotadan
// önce taze bir dinleyici kuruluyor.
function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function assertNoHorizontalOverflow(page: Page, routeLabel: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    scrollWidth,
    `${routeLabel}: yatay taşma var (document.documentElement.scrollWidth=${scrollWidth} > window.innerWidth=${innerWidth})`
  ).toBeLessThanOrEqual(innerWidth);
}

async function assertNoDeadButtons(page: Page, routeLabel: string) {
  // Görünür buton/linkler var mı (sayfa gerçekten render olmuş, boş/çökmüş değil).
  const visibleInteractive = page.locator("button:visible, a:visible");
  const interactiveCount = await visibleInteractive.count();
  expect(interactiveCount, `${routeLabel}: sayfada hiç görünür buton/link yok`).toBeGreaterThan(0);

  // "Ölü" link kontrolü: görünür bir `<a>` metni varsa, `href` boş veya "#" olmamalı.
  const deadLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors
      .filter((a) => {
        const style = window.getComputedStyle(a);
        const hasText = (a.textContent ?? "").trim().length > 0;
        const isVisible = style.display !== "none" && style.visibility !== "hidden" && a.offsetParent !== null;
        return hasText && isVisible;
      })
      .filter((a) => {
        const href = a.getAttribute("href");
        return !href || href === "#";
      })
      .map((a) => a.textContent?.trim());
  });
  expect(deadLinks, `${routeLabel}: href="#"/boş olan ölü link(ler) bulundu`).toEqual([]);
}

async function auditRoute(page: Page, path: string, routeLabel: string) {
  const errors = collectPageErrors(page);
  await page.goto(path, { waitUntil: "networkidle" });
  await assertNoHorizontalOverflow(page, routeLabel);
  await assertNoDeadButtons(page, routeLabel);
  expect(errors, `${routeLabel}: sayfa yüklenirken JS hatası fırladı: ${errors.join(" | ")}`).toEqual([]);
}

async function loginVendor(page: Page) {
  await page.goto("/vendor/giris");
  await page.locator("#vendor-username").fill(MARKET.username);
  await page.locator("#vendor-password").fill(MARKET.password);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/vendor\/panel/);
}

async function loginAdmin(page: Page) {
  await page.goto("/admin/giris");
  await page.locator("#admin-username").fill(ADMIN.username);
  await page.locator("#admin-password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/admin\/panel/);
}

async function loginCourier(page: Page) {
  await page.goto("/kurye/giris");
  await page.locator("#courier-username").fill(COURIER.username);
  await page.locator("#courier-password").fill(COURIER.password);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/kurye\/panel/);
}

test.describe("UI/UX denetimi — mobil (390px, iPhone 13 emülasyonu)", () => {
  test("Anasayfa", async ({ page }) => {
    await auditRoute(page, "/", "Anasayfa");
  });

  test("Tüm Ürünler listesi (/arama)", async ({ page }) => {
    await auditRoute(page, "/arama", "Tüm Ürünler listesi");
  });

  test("Ürün Detay sayfası", async ({ page, request }) => {
    const slug = await fetchAnyActiveProductSlug(request);
    await auditRoute(page, `/urun/${slug}`, "Ürün Detay sayfası");
  });

  test("Admin Paneli (Dashboard)", async ({ page }) => {
    await loginAdmin(page);
    await auditRoute(page, "/admin/panel", "Admin Paneli (Dashboard)");
  });

  test("Vendor Paneli (Ürünler)", async ({ page }) => {
    await loginVendor(page);
    await auditRoute(page, "/vendor/urunler", "Vendor Paneli (Ürünler)");
  });

  test("Kurye Paneli", async ({ page }) => {
    await loginCourier(page);
    await auditRoute(page, "/kurye/panel", "Kurye Paneli");
  });
});
