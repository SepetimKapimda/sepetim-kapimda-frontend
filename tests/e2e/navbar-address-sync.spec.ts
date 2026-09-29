import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Header/Navbar'daki "Teslimat adresi" dropdown'u — gerçek backend verisi,
 * boş-durum ve Checkout senkronizasyonu için uçtan uca entegrasyon testleri.
 *
 * BİLİNÇLİ OLARAK HİÇBİR AĞ İSTEĞİ MOCK'LANMAZ. `useAddressStore` (Zustand)
 * hem Navbar'ı hem Checkout'u besler — bu testler tam olarak bu paylaşılan
 * state'in iki farklı sayfa arasında doğru senkronize olduğunu doğrular.
 *
 * Ön koşullar (full-lifecycle.spec.ts ile aynı):
 *   - Backend  http://127.0.0.1:8000 çalışıyor olmalı.
 *   - Frontend http://localhost:3000 çalışıyor olmalı.
 *   - musteri2@sanalmarket.test (şifre: Test2026!) seed edilmiş ve en az bir
 *     kayıtlı adresi olmalı (bkz. `manage.py seed_test_data`).
 */

const PASSWORD = "Test2026!";
const BACKEND_URL = "http://127.0.0.1:8000";
const CUSTOMER = { username: "musteri2@sanalmarket.test", password: PASSWORD };

async function apiLogin(request: APIRequestContext, username: string, password: string): Promise<string> {
  const res = await request.post(`${BACKEND_URL}/api/users/login/`, { data: { username, password } });
  if (!res.ok()) throw new Error(`Giriş başarısız (HTTP ${res.status()}): ${await res.text()}`);
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

async function addRealProductToCart(request: APIRequestContext, token: string) {
  const productsRes = await request.get(`${BACKEND_URL}/api/products/?page_size=10`);
  const { results: products } = (await productsRes.json()) as { results: { id: number; in_stock: boolean }[] };
  const product = products.find((p) => p.in_stock);
  if (!product) throw new Error("Stokta ürün bulunamadı.");
  await request.post(`${BACKEND_URL}/api/carts/add`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { product_id: product.id, quantity: 1 },
  });
}

test.describe("Header teslimat adresi ↔ Checkout senkronizasyonu", () => {
  test("Header'da seçilen adres, Checkout'ta otomatik seçili gelir", async ({ page, request }) => {
    const token = await apiLogin(request, CUSTOMER.username, CUSTOMER.password);
    const authHeaders = { Authorization: `Bearer ${token}` };
    await addRealProductToCart(request, token);

    // Önceki BAŞARISIZ bir çalıştırmadan (bu dosya veya
    // notifications-and-address.spec.ts'in adres testi) kalmış test
    // adresleri varsa önce temizle — aksi halde aşağıdaki "seed adresi"
    // tespiti yanlış adresi (kendi test çöpünü) seçebilir.
    const TEST_ADDRESS_NAMES = ["Header Sync Test", "E2E GPS Test"];
    const cleanupRes = await request.get(`${BACKEND_URL}/api/addresses/?page_size=50`, {
      headers: authHeaders,
    });
    const { results: preExisting } = (await cleanupRes.json()) as {
      results: { id: number; full_name: string; neighborhood_display: string }[];
    };
    for (const stale of preExisting.filter((a) => TEST_ADDRESS_NAMES.includes(a.full_name))) {
      await request.delete(`${BACKEND_URL}/api/addresses/${stale.id}`, { headers: authHeaders });
    }

    // Musteri2'nin seed'den gelen (mevcut) adresini not al — testin sonunda
    // Header'dan bilerek BUNA geri döneceğiz. Seed hesabı "Zeynep Arslan"
    // adıyla oluşturulur (bkz. `manage.py seed_test_data`).
    const seedAddress = preExisting.find((a) => !TEST_ADDRESS_NAMES.includes(a.full_name));
    if (!seedAddress) throw new Error("musteri2'nin seed'den gelen bir adresi yok.");

    // Musteri2'nin seed adresinden FARKLI bir ilçe/mahallede ikinci, gerçek bir
    // adres oluşturuyoruz — Header dropdown'unda seçilebilir iki gerçek
    // seçenek olsun diye (canlı /api/addresses/locations/ verisiyle).
    const locationsRes = await request.get(`${BACKEND_URL}/api/addresses/locations/`);
    const locations = (await locationsRes.json()) as {
      districts: { value: string; neighborhoods: { value: string; label: string }[] }[];
    };
    const district = locations.districts[0];
    const neighborhood = district.neighborhoods[1] ?? district.neighborhoods[0];

    const createRes = await request.post(`${BACKEND_URL}/api/addresses/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        full_name: "Header Sync Test",
        phone: "5551239876",
        street: "Header senkronizasyon testi sokak no:9",
        district: district.value,
        neighborhood: neighborhood.value,
        address_type: "work",
        latitude: 40.685,
        longitude: 30.615,
      },
    });
    if (!createRes.ok()) {
      throw new Error(`İkinci adres oluşturulamadı (HTTP ${createRes.status()}): ${await createRes.text()}`);
    }
    const createdAddress = (await createRes.json()) as { id: number };

    await loginViaUi(page, CUSTOMER.username, CUSTOMER.password);

    // Header'daki dropdown gerçek verilerle dolmalı — mock değil. Liste en
    // yeni oluşturulan adresi (az önce eklenen "Header Sync Test") varsayılan
    // seçili gösterir; testin asıl konusu bunu bilerek SEED adresine
    // ÇEVİRMEK ve bu seçimin Checkout'a taşındığını doğrulamak.
    const addressButton = page.getByRole("button", { name: /Teslimat adresini değiştir/ });
    await expect(addressButton).toBeVisible({ timeout: 15_000 });
    await expect(addressButton).toContainText(neighborhood.label);
    await addressButton.click();

    const dropdownPanel = page.getByTestId("address-dropdown-panel");
    await expect(dropdownPanel).toBeVisible();
    await dropdownPanel.getByRole("button", { name: new RegExp(seedAddress.neighborhood_display) }).click();

    // Header artık bilerek seçilen SEED adresini göstermeli.
    await expect(addressButton).toContainText(seedAddress.neighborhood_display);

    // Checkout'a git — sipariş verilecek adres olarak Header'da SEÇİLEN adres
    // (seed adresi) otomatik gelmeli, en son eklenen değil.
    await page.goto("/checkout");
    const selectedCard = page.locator('button[aria-pressed="true"]', { hasText: seedAddress.full_name });
    await expect(selectedCard).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('button[aria-pressed="true"]', { hasText: "Header Sync Test" })
    ).toHaveCount(0);

    // Temizlik: bu test kalıcı bir ikinci adres bırakmasın.
    await request.delete(`${BACKEND_URL}/api/addresses/${createdAddress.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});

test.describe("Header teslimat adresi — boş durum", () => {
  test("Hiç adresi olmayan yeni müşteri için Header 'Yeni Adres Ekle' gösterir ve Adreslerim'e yönlendirir", async ({
    page,
    request,
  }) => {
    // Taze, adressiz bir müşteri hesabı — gerçek kayıt API'siyle oluşturulur.
    const uniqueSuffix = Date.now();
    const username = `e2e.navbar.bosadres.${uniqueSuffix}@sanalmarket.test`;
    const registerRes = await request.post(`${BACKEND_URL}/api/users/register/`, {
      data: {
        username,
        email: username,
        password: PASSWORD,
        password_confirm: PASSWORD,
        first_name: "Navbar",
        last_name: "BosAdresTest",
        accepted_terms: true,
        accepted_privacy: true,
        accepts_marketing: false,
      },
    });
    if (!registerRes.ok()) {
      throw new Error(`Test müşterisi kaydı başarısız (HTTP ${registerRes.status()}): ${await registerRes.text()}`);
    }

    await loginViaUi(page, username, PASSWORD);

    // Dropdown değil, doğrudan "Yeni Adres Ekle" linki görünmeli.
    const emptyStateLink = page.getByRole("link", { name: "Teslimat adresi ekle" });
    await expect(emptyStateLink).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Teslimat adresini değiştir/ })).toHaveCount(0);

    await emptyStateLink.click();
    await expect(page).toHaveURL(/\/hesabim\?tab=addresses/);
    await expect(page.getByRole("heading", { name: "Adreslerim", level: 2 })).toBeVisible();
  });
});
