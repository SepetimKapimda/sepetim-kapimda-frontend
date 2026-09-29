import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Bildirim zili (gerçek API + sesli uyarı) ve checkout adres formu
 * (gerçek ilçe/mahalle verisi + zorunlu GPS) için uçtan uca entegrasyon
 * testleri.
 *
 * BİLİNÇLİ OLARAK HİÇBİR AĞ İSTEĞİ MOCK'LANMAZ — hem tarayıcı hem `request`
 * fixture'ı doğrudan çalışan backend'e (127.0.0.1:8000) bağlanır; UI'daki
 * dropdown'lar, zil listesi ve GPS validasyonu gerçek backend yanıtlarıyla
 * doğrulanır.
 *
 * Ön koşullar (full-lifecycle.spec.ts ile aynı):
 *   - Backend  http://127.0.0.1:8000 çalışıyor olmalı.
 *   - Frontend http://localhost:3000 çalışıyor olmalı (`npm run dev`).
 *   - Şu hesaplar seed edilmiş olmalı (şifre: Test2026!):
 *     admin@sanalmarket.test, musteri2@sanalmarket.test
 *     (bkz. `manage.py seed_test_data`).
 *
 * Bildirim zili testi, backend'in "yeni sipariş" olayında admin'e panel
 * bildirimi gönderdiği gerçek davranışa dayanır (notifications/services.py
 * `notify_order_created`) — sesin autoplay kısıtına takılmadan çalması için
 * gereken "ilk kullanıcı etkileşimi" zaten giriş formunu göndermekle
 * gerçekleşir.
 *
 * Not: Müşteri hesabı olarak bilinçli olarak `musteri1` DEĞİL `musteri2`
 * kullanılır — `full-lifecycle.spec.ts` `musteri1`'i kullanıyor ve
 * `npx playwright test` varsayılan olarak dosyaları paralel workerlarda
 * çalıştırıyor; aynı hesaba iki ayrı dosyadan eşzamanlı sepet/sipariş
 * isteği atmak (aynı kullanıcının sepetinin bir worker'da temizlenirken
 * diğerinin ona güvenmesi gibi) sahte/aralıklı başarısızlıklara yol açar.
 */

const PASSWORD = "Test2026!";
const BACKEND_URL = "http://127.0.0.1:8000";
const ADMIN = { username: "admin@sanalmarket.test", password: PASSWORD };
const CUSTOMER = { username: "musteri2@sanalmarket.test", password: PASSWORD };

async function apiLogin(
  request: APIRequestContext,
  path: string,
  username: string,
  password: string
): Promise<string> {
  const res = await request.post(`${BACKEND_URL}${path}`, { data: { username, password } });
  if (!res.ok()) {
    throw new Error(`Giriş başarısız (HTTP ${res.status()}): ${await res.text()}`);
  }
  const body = await res.json();
  return body.access as string;
}

async function loginViaUi(page: Page, username: string, password: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Giriş Yap / Üye Ol" }).click();
  await page.getByLabel("Kullanıcı Adı").fill(username);
  await page.getByLabel("Şifre").fill(password);
  await page.locator("form").getByRole("button", { name: "Giriş Yap", exact: true }).click();
  await expect(page.getByRole("button", { name: "Giriş Yap / Üye Ol" })).toHaveCount(0);
}

// Bir müşterinin sepetine gerçek (stoktaki) bir ürün ekler — mock veri yok,
// doğrudan canlı `/api/products/` ve `/api/carts/add` uçları kullanılır.
async function addRealProductToCart(request: APIRequestContext, token: string) {
  const productsRes = await request.get(`${BACKEND_URL}/api/products/?page_size=10`);
  const { results: products } = (await productsRes.json()) as { results: { id: number; in_stock: boolean }[] };
  const product = products.find((p) => p.in_stock);
  if (!product) throw new Error("Stokta ürün bulunamadı — checkout testi için en az bir ürün gerekli.");
  await request.post(`${BACKEND_URL}/api/carts/add`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { product_id: product.id, quantity: 1 },
  });
}

// Müşterinin kayıtlı adresiyle gerçek bir sipariş oluşturur. Backend bu
// olayda admin/market/kurye yöneticisine `order.created` panel bildirimi
// gönderir — testin doğrulayacağı canlı olay budur.
async function createRealOrderAsCustomer(request: APIRequestContext): Promise<number> {
  const token = await apiLogin(request, "/api/users/login/", CUSTOMER.username, CUSTOMER.password);
  const authHeaders = { Authorization: `Bearer ${token}` };

  await addRealProductToCart(request, token);

  const addressesRes = await request.get(`${BACKEND_URL}/api/addresses/?page_size=1`, {
    headers: authHeaders,
  });
  const { results: addresses } = (await addressesRes.json()) as { results: { id: number }[] };
  if (!addresses.length) throw new Error("Test müşterisinin kayıtlı adresi yok.");
  const addressId = addresses[0].id;

  const orderRes = await request.post(`${BACKEND_URL}/api/orders/create`, {
    headers: authHeaders,
    data: {
      delivery_address_id: addressId,
      billing_address_id: addressId,
      payment_method: "cash",
      courier_note: "",
    },
  });
  if (!orderRes.ok()) {
    throw new Error(`Sipariş oluşturulamadı (HTTP ${orderRes.status()}): ${await orderRes.text()}`);
  }
  const { order_id } = await orderRes.json();
  return order_id as number;
}

test.describe("Bildirim zili — gerçek API entegrasyonu", () => {
  test.setTimeout(90_000);

  test("yeni sipariş bildirimi zilde görünür ve sesli uyarı tetiklenir", async ({ page, request }) => {
    // Temiz bir başlangıç: admin'in mevcut bildirimlerini API üzerinden okundu işaretle.
    const adminToken = await apiLogin(request, "/api/users/admin-login/", ADMIN.username, ADMIN.password);
    await request.post(`${BACKEND_URL}/api/notifications/read-all/`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await page.goto("/admin/giris");
    await page.locator("#admin-username").fill(ADMIN.username);
    await page.locator("#admin-password").fill(ADMIN.password);
    // Giriş formunu göndermek, tarayıcının "sesli autoplay için kullanıcı
    // etkileşimi şart" kısıtını burada karşılar — bileşen bu tıklamadan
    // itibaren sesi kilitsiz çalabilir hale gelir.
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/admin\/panel/);

    const bellButton = page.getByRole("button", { name: "Bildirimler" });
    await expect(bellButton).toBeVisible();
    // Az önce tümünü okundu işaretlediğimiz için rozet şu an görünmemeli.
    await expect(bellButton.locator("span")).toHaveCount(0);

    const audio = page.locator("audio");

    // Mock yok: gerçek bir sipariş oluştur, backend admin'e panel bildirimi göndersin.
    const orderId = await createRealOrderAsCustomer(request);

    // Zil, okunmamış sayacı 15 sn'lik gerçek polling ile tazeler.
    await expect(bellButton).toContainText("1", { timeout: 20_000 });

    // Autoplay kilidi zaten açık olduğu için polling artışı sesi otomatik çalmalı.
    await expect
      .poll(async () => audio.evaluate((el: HTMLMediaElement) => el.played.length), { timeout: 5_000 })
      .toBeGreaterThan(0);

    await bellButton.click();
    // Liste yeniden eskiye sıralı olduğu için en üstteki (ilk) kayıt bu testin
    // az önce oluşturduğu siparişe ait olmalı — sipariş numarasıyla doğrulanır.
    await expect(page.getByText("Yeni Sipariş").first()).toBeVisible();
    await expect(page.getByText(`#SM-${orderId}`, { exact: false }).first()).toBeVisible();

    // Temizlik: bu test her çalıştırmada kalıcı bir sipariş bırakmasın diye
    // az önce oluşturduğu siparişi iptal eder (RECEIVED durumundayken serbest).
    const customerToken = await apiLogin(request, "/api/users/login/", CUSTOMER.username, CUSTOMER.password);
    await request.post(`${BACKEND_URL}/api/orders/${orderId}/cancel/`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
  });
});

test.describe("Checkout adres formu — gerçek ilçe/mahalle verisi ve zorunlu GPS", () => {
  test("mahalle ilçeye kadar kapalı kalır, GPS olmadan kaydedilemez, konum paylaşılınca gerçek API'ye kaydedilir", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, "/api/users/login/", CUSTOMER.username, CUSTOMER.password);
    await addRealProductToCart(request, token);

    // Formun göstereceği ilçe/mahalle etiketlerini canlı uçtan bağımsızca al —
    // DOM'daki seçenekleri buna karşı doğrulayacağız (mock ihtimalini eler).
    const locationsRes = await request.get(`${BACKEND_URL}/api/addresses/locations/`);
    const locations = (await locationsRes.json()) as {
      districts: { label: string; neighborhoods: { label: string }[] }[];
    };
    const firstDistrict = locations.districts[0];
    const firstNeighborhood = firstDistrict.neighborhoods[0];

    await loginViaUi(page, CUSTOMER.username, CUSTOMER.password);
    await page.goto("/checkout");

    await page.getByRole("button", { name: "Yeni Adres Ekle" }).click();
    const addressDialog = page.getByRole("dialog", { name: "Yeni Adres Ekle" });
    await expect(addressDialog).toBeVisible();

    const districtSelect = addressDialog.locator("select").nth(1);
    const neighborhoodSelect = addressDialog.locator("select").nth(2);

    // Mahalle, ilçe seçilmeden backend'den boş/kapalı kalmalı.
    await expect(neighborhoodSelect).toBeDisabled();

    // İlçe listesindeki ilk gerçek seçenek, canlı /api/addresses/locations/
    // yanıtındaki etiketle birebir eşleşmeli (sabit/mock bir liste değil).
    await expect(districtSelect.locator("option").nth(1)).toHaveText(firstDistrict.label);

    await addressDialog.getByLabel("Ad Soyad").fill("E2E GPS Test");
    await addressDialog.getByLabel("Telefon").fill("5559998877");
    await districtSelect.selectOption({ label: firstDistrict.label });

    await expect(neighborhoodSelect).toBeEnabled();
    await expect(neighborhoodSelect.locator("option").nth(1)).toHaveText(firstNeighborhood.label);
    await neighborhoodSelect.selectOption({ label: firstNeighborhood.label });

    await addressDialog.getByLabel("Açık Adres").fill("Test sokak, GPS testi, no: 2");

    // GPS paylaşılmadan "Kaydet" kesinlikle devre dışı kalmalı.
    await expect(addressDialog.getByRole("button", { name: "Kaydet" })).toBeDisabled();

    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 40.6844, longitude: 30.4028 });
    await addressDialog.getByRole("button", { name: "Mevcut Konumumu Kullan" }).click();
    await expect(addressDialog.getByText("Konum alındı")).toBeVisible();
    await expect(addressDialog.getByRole("button", { name: "Kaydet" })).toBeEnabled();

    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/addresses/") && res.request().method() === "POST"
      ),
      addressDialog.getByRole("button", { name: "Kaydet" }).click(),
    ]);
    await expect(addressDialog).toHaveCount(0);
    await expect(page.getByText("Adres eklendi.")).toBeVisible();

    // Temizlik: bu test her çalıştırmada kalıcı bir adres bırakmasın.
    const { id: createdAddressId } = (await createResponse.json()) as { id: number };
    await request.delete(`${BACKEND_URL}/api/addresses/${createdAddressId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
