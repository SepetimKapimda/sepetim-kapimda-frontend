import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Admin Paneli — Dinamik Sözleşmeler, Marka Yönetimi (Logo/Favicon) ve Toplu
 * E-Posta E2E testi. Üçü de GERÇEK backend uçlarına bağlı (mock katman yok):
 *   - `GET/PATCH /api/admin/pages/{slug}/` (sözleşmeler, `managedPages.ts`)
 *   - `PATCH /api/admin/settings/` multipart (logo/favicon, `adminSettings.ts`)
 *   - `POST /api/admin/bulk-email/` (toplu e-posta, `adminMarketing.ts`)
 *
 * Kapsam:
 *   1. `/admin/site-icerigi`: bir sözleşmenin metnini (HTML) düzenleyip
 *      kaydetme → müşteri tarafındaki `/sayfa/[slug]` sayfasında anında
 *      görünmesi. Başka bir sözleşmeye PDF yükleyip aynı doğrulama.
 *   2. `/admin/ayarlar`: yeni bir logo yükleyip, backend'in döndürdüğü gerçek
 *      `logo_url`'in müşteri anasayfasındaki Navbar logosuna anında (aynı
 *      tarayıcı bağlamı içinde, `useBrandingStore`'un önbelleği sayesinde)
 *      yansıması. Ayrıca TAMAMEN AYRI (önceki oturumla localStorage/cookie
 *      paylaşmayan) bir tarayıcı bağlamındaki anonim bir ziyaretçinin de aynı
 *      logoyu herkese açık `GET /api/core/settings/` üzerinden gördüğünü
 *      doğrulayan ikinci bir test.
 *   3. `/admin/pazarlama` → "Toplu E-Posta" sekmesi: formu doldurup
 *      gönderme, backend'in beklenen durum kodlarından biriyle (202 kabul
 *      edildi / 400 uygun alıcı yok / 409 önceki gönderim sürüyor) yanıt
 *      verdiğini ve arayüzün donmadan (loading biter, toast görünür) tepki
 *      verdiğini doğrular.
 *
 * ÖNEMLİ — PDF/logo yüklemeleri backend'de Supabase Storage'a senkron olarak
 * yazılıyor; bu makineden Supabase'e giden bağlantı (önceki bir oturumda
 * teşhis edilen, kökeni hâlâ çözülmemiş bir ağ/güvenlik yazılımı kısıtı
 * nedeniyle) YAVAŞ — canlı `curl` testiyle tek bir PDF yüklemesinin ~15
 * saniye sürdüğü doğrulandı. Bu yüzden dosya yükleyen adımların toast
 * beklentilerine bilinçli olarak uzun (30s) timeout verildi ve testin genel
 * süresi 120 saniyeye çıkarıldı — bu bir test hatası değil, ortamın bilinen
 * bir kısıtı.
 *
 * Ön koşullar (test kendisi başlatmaz): backend (127.0.0.1:8000) ve frontend
 * (localhost:3000) çalışıyor olmalı; `admin@sanalmarket.test` (şifre:
 * Test2026!) seed edilmiş olmalı.
 *
 * Bilinen kısıt: Backend giriş uçlarında DRF hız sınırlama (throttling) aktif
 * (bkz. diğer E2E dosyalarındaki aynı not) — bu test TEK bir admin girişi
 * kullanacak şekilde tasarlandı, ama yine de diğer testlerle art arda,
 * aralıksız çalıştırılırsa throttling'e takılabilir.
 */

const PASSWORD = "Test2026!";
const ADMIN = { username: "admin@sanalmarket.test", password: PASSWORD };
const BACKEND_URL = "http://127.0.0.1:8000";

test.setTimeout(120_000);
const UPLOAD_TOAST_TIMEOUT = 30_000;

const DUMMY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const DUMMY_PDF_CONTENT = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 20 100 Td (E2E Test PDF) Tj ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`;

let tempDir: string;
let tempPngPath: string;
let tempPdfPath: string;

test.beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sanalmarket-e2e-cms-"));
  tempPngPath = path.join(tempDir, "test-logo.png");
  fs.writeFileSync(tempPngPath, Buffer.from(DUMMY_PNG_BASE64, "base64"));
  tempPdfPath = path.join(tempDir, "test-sozlesme.pdf");
  fs.writeFileSync(tempPdfPath, DUMMY_PDF_CONTENT, "utf-8");
});

test.afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function loginAdmin(page: Page) {
  await page.goto("/admin/giris");
  await page.locator("#admin-username").fill(ADMIN.username);
  await page.locator("#admin-password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/admin\/panel/);
}

test("Admin: sözleşme, marka ve toplu e-posta yönetimi uçtan uca", async ({ page, context }) => {
  await loginAdmin(page);

  // --- 1a) Sözleşme — HTML metnini düzenle, müşteri sayfasında doğrula ---
  await page.goto("/admin/site-icerigi");
  const marker = `E2E test içeriği ${Date.now()}`;

  const kvkkCard = page.locator('[data-testid="managed-page-card-kvkk-aydinlatma-metni"]');
  await expect(kvkkCard).toBeVisible();
  await kvkkCard.locator("#managed-page-html-kvkk-aydinlatma-metni").fill(`<p>${marker}</p>`);
  await kvkkCard.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("status")).toContainText("güncellendi");

  const kvkkPublicPage = await context.newPage();
  await kvkkPublicPage.goto("/sayfa/kvkk-aydinlatma-metni");
  await expect(kvkkPublicPage.getByText(marker)).toBeVisible();
  await kvkkPublicPage.close();

  // --- 1b) Sözleşme — PDF yükle, müşteri sayfasında PDF görünümünü doğrula ---
  const cerezCard = page.locator('[data-testid="managed-page-card-cerez-politikasi"]');
  await cerezCard.getByRole("button", { name: "PDF Dosyası" }).click();
  await cerezCard.locator("#managed-page-pdf-input-cerez-politikasi").setInputFiles(tempPdfPath);
  await expect(page.getByRole("status")).toContainText("PDF yayınlandı", {
    timeout: UPLOAD_TOAST_TIMEOUT,
  });

  const cerezPublicPage = await context.newPage();
  await cerezPublicPage.goto("/sayfa/cerez-politikasi");
  await expect(cerezPublicPage.getByText("Bu belge PDF olarak yayınlanmıştır.")).toBeVisible();
  await cerezPublicPage.close();

  // --- 1c) Hukuki kısıtlama — MSS/ÖBF kartlarında "PDF Dosyası" seçeneği yok,
  // diğer altı kartta (Hakkımızda/İletişim dahil) var ---
  const mssCard = page.locator('[data-testid="managed-page-card-mesafeli-satis-sozlesmesi"]');
  await expect(mssCard.getByRole("button", { name: "PDF Dosyası" })).toHaveCount(0);
  const obfCard = page.locator('[data-testid="managed-page-card-on-bilgilendirme-formu"]');
  await expect(obfCard.getByRole("button", { name: "PDF Dosyası" })).toHaveCount(0);

  const hakkimizdaCard = page.locator('[data-testid="managed-page-card-hakkimizda"]');
  await expect(hakkimizdaCard.getByRole("button", { name: "PDF Dosyası" })).toHaveCount(1);
  const iletisimCard = page.locator('[data-testid="managed-page-card-iletisim"]');
  await expect(iletisimCard.getByRole("button", { name: "PDF Dosyası" })).toHaveCount(1);

  // --- 1d) Toplam 8 yönetilen sayfa kartı listeleniyor ---
  await expect(page.locator('[data-testid^="managed-page-card-"]')).toHaveCount(8);

  // --- 1e) Yeni eklenen Hakkımızda/İletişim kartları da HTML olarak
  // kaydedilebiliyor (aşağıdaki sidebar navigasyon testi bu içeriğe dayanır) ---
  const hakkimizdaMarker = `Hakkımızda E2E ${Date.now()}`;
  await hakkimizdaCard.locator("#managed-page-html-hakkimizda").fill(`<p>${hakkimizdaMarker}</p>`);
  await hakkimizdaCard.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("status")).toContainText("güncellendi");

  const iletisimMarker = `İletişim E2E ${Date.now()}`;
  await iletisimCard.locator("#managed-page-html-iletisim").fill(`<p>${iletisimMarker}</p>`);
  await iletisimCard.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("status")).toContainText("güncellendi");

  // --- 2) Marka Yönetimi — yeni logo yükle, Navbar'a anında yansımasını doğrula ---
  await page.goto("/admin/ayarlar");
  const [settingsResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/admin/settings/") && res.request().method() === "PATCH"
    ),
    page.locator("#brand-logo-input").setInputFiles(tempPngPath),
  ]);
  const updatedSettings = (await settingsResponse.json()) as { logo_url: string | null };
  expect(updatedSettings.logo_url).toBeTruthy();
  await expect(page.getByRole("status")).toContainText("Logo güncellendi", {
    timeout: UPLOAD_TOAST_TIMEOUT,
  });

  const homePage = await context.newPage();
  await homePage.goto("/");
  const navbarLogoSrc = await homePage
    .locator('img[alt="Sepetim Kapımda"]')
    .first()
    .getAttribute("src");
  expect(navbarLogoSrc).toBe(updatedSettings.logo_url);
  await homePage.close();

  // --- 3) Toplu E-Posta — formu gönder, backend'in beklenen durum kodlarından
  // biriyle yanıt verdiğini ve arayüzün donmadan tepki verdiğini doğrula ---
  await page.goto("/admin/pazarlama");
  await page.getByRole("button", { name: "Toplu E-Posta" }).click();
  await page.locator("#bulk-email-subject").fill(`E2E Test Kampanyası ${Date.now()}`);
  await page.locator("#bulk-email-message").fill("Bu bir E2E test mesajıdır, dikkate alınmayınız.");

  const [emailResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/admin/bulk-email/") && res.request().method() === "POST"
    ),
    page.getByRole("button", { name: "Gönder" }).click(),
  ]);
  expect([202, 400, 409]).toContain(emailResponse.status());
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("button", { name: "Gönder" })).toBeEnabled();
});

test("Anonim ziyaretçi: Navbar logosu herkese açık /api/core/settings/ üzerinden gelir", async ({
  browser,
  request,
}) => {
  // Bu test, yukarıdaki testin az önce yüklediği logoyu ADMİN OTURUMU OLMADAN
  // görebildiğimizi kanıtlamak için bilinçli olarak TAMAMEN AYRI (localStorage/
  // cookie paylaşmayan) yeni bir tarayıcı bağlamı kullanır.
  const settingsRes = await request.get(`${BACKEND_URL}/api/core/settings/`);
  const settings = (await settingsRes.json()) as { logo_url: string | null };
  test.skip(!settings.logo_url, "Backend'de henüz bir logo yüklenmemiş.");

  const anonymousContext = await browser.newContext();
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto("/");
  // Logo, sunucu tarafında değil `BrandingBootstrap`'ın istemci taraflı
  // `GET /api/core/settings/` isteği tamamlandıktan SONRA `useBrandingStore`
  // üzerinden yazılıyor (bkz. Logo.tsx) — ilk boyamada her zaman statik
  // `/logo.png` görünür. Bu yüzden `src`'yi hemen okumak yerine, gerçek
  // logoya güncellenmesini bekliyoruz (auto-retrying `toHaveAttribute`).
  const navbarLogo = anonymousPage.locator('img[alt="Sepetim Kapımda"]').first();
  await expect(navbarLogo).toHaveAttribute("src", settings.logo_url!, { timeout: 10_000 });
  await anonymousContext.close();
});

test("Anonim ziyaretçi: /sayfa/[slug] Getir tarzı sidebar ile 8 sayfa arasında gezinebiliyor", async ({
  page,
}) => {
  await page.goto("/sayfa/kvkk-aydinlatma-metni");

  const desktopSidebar = page.locator('[data-testid="corporate-nav-desktop"]');
  await expect(desktopSidebar.getByRole("link")).toHaveCount(8);
  await expect(desktopSidebar.getByRole("link", { name: "Hakkımızda" })).toBeVisible();
  await expect(desktopSidebar.getByRole("link", { name: "İletişim" })).toBeVisible();

  // Sidebar'dan "İletişim"e tıklayınca sağ panel client-side yeniden yüklenmeden değişmeli.
  await desktopSidebar.getByRole("link", { name: "İletişim" }).click();
  await expect(page).toHaveURL(/\/sayfa\/iletisim$/);
  await expect(page.getByRole("heading", { level: 1, name: "İletişim" })).toBeVisible();

  await desktopSidebar.getByRole("link", { name: "Hakkımızda" }).click();
  await expect(page).toHaveURL(/\/sayfa\/hakkimizda$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hakkımızda" })).toBeVisible();
});
