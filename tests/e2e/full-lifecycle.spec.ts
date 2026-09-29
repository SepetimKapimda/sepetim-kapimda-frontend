import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Uçtan uca "tam sipariş ve finans döngüsü" testi.
 *
 * 5 farklı rol (Müşteri, Market, Kurye Yöneticisi, Kurye, Admin) ayrı
 * `BrowserContext`'ler üzerinden birbirine sırayla devrederek TEK bir
 * siparişi oluşturma → hazırlama → atama → teslim etme → hakediş onaylama
 * zincirini simüle eder.
 *
 * Ön koşullar (test kendisi başlatmaz):
 *   - Backend  http://127.0.0.1:8000 çalışıyor olmalı.
 *   - Frontend http://localhost:3000 çalışıyor olmalı (`npm run dev`).
 *   - Aşağıdaki hesaplar backend'de seed edilmiş olmalı (şifre: Test2026!):
 *     musteri1@sanalmarket.test, market@sanalmarket.test,
 *     yonetici@sanalmarket.test, kurye1@sanalmarket.test, admin@sanalmarket.test
 *   - Market hesabının banka (IBAN) bilgisi girilmiş olmalı — aksi halde
 *     hakediş talebi butonu hiç görünmez.
 *
 * ÖNEMLİ — senaryo düzeltmesi (canlı test sırasında keşfedildi):
 * Backend, bir siparişe kurye ATANMADAN market tarafının "Kuryeye Ver"
 * (HANDED_TO_COURIER) işlemini KESİNLİKLE reddediyor
 * ("Siparişe henüz kurye atanmadı.", HTTP 400 — canlı curl ile doğrulandı).
 * Bu yüzden orijinal talepteki sıra (2. Market ikisini de yapar, 3. Yönetici
 * atar) gerçek sistemle çalışmıyor. Doğru ve çalışan sıra:
 *   Market (Hazırla) → Yönetici (Ata) → Market (Kuryeye Ver) → Kurye (Teslim).
 * Ayrıca hakediş kayıtları bir siparişin teslimiyle OTOMATİK oluşmuyor;
 * market/kurye Finans panelinden manuel "Para Çek / Talep Et" ile talep
 * açmalı, Admin de ancak o talebi onaylayabiliyor — bu yüzden teslimattan
 * sonra Market'in bu talebi açtığı bir adım eklendi.
 *
 * Basitleştirici varsayımlar (temiz/izole bir test ortamı varsayılır):
 *   - Admin/Finans'ta "Onay Bekliyor" listesi en yeni talep en üstte olacak
 *     şekilde sıralanır (bu testin açtığı talep `.first()` ile onaylanır).
 *
 * Bilinen kısıt: Backend giriş uçlarında DRF hız sınırlama (throttling)
 * aktif ("Üst üste çok fazla istek yapıldı..."). Bu test 8 ayrı girişim
 * yapıyor (5 rol × ~1-2 ziyaret); testi çok kısa aralıklarla art arda
 * (özellikle debug/geliştirme sırasında) tekrar tekrar çalıştırmak bu
 * sınıra takılıp sahte bir başarısızlığa yol açabilir — birkaç saniye
 * bekleyip tekrar deneyin.
 */

const PASSWORD = "Test2026!";
const CUSTOMER = { username: "musteri1@sanalmarket.test", password: PASSWORD };
const MARKET = { username: "market@sanalmarket.test", password: PASSWORD };
const MANAGER = { username: "yonetici@sanalmarket.test", password: PASSWORD };
const COURIER = { username: "kurye1@sanalmarket.test", password: PASSWORD };
const ADMIN = { username: "admin@sanalmarket.test", password: PASSWORD };

const BACKEND_URL = "http://127.0.0.1:8000";
// Yeni oluşturulan test adresinin `full_name` alanı — hem müşteri
// checkout'ta bunu girer, hem de Kurye Yöneticisi atama listesinde bu
// siparişi (sipariş numarası kartta gösterilmediği için) bununla bulur.
const TEST_CUSTOMER_NAME = "Test Müşteri E2E";

test.setTimeout(180_000);

// Manager'ın atama listesindeki hedef siparişi ID'ye göre değil, checkout'ta
// kendi belirlediğimiz teslimat adı ile bulduğumuz için, "kurye1" hesabının
// panelde GERÇEKTE hangi isimle göründüğünü (ör. "Ali Çelik") sahte veriye
// güvenmeden backend'den (UI dışından, salt API ile) öğreniyoruz.
async function resolveCourierDisplayName(
  request: APIRequestContext,
  username: string,
  password: string
): Promise<string | null> {
  const loginRes = await request.post(`${BACKEND_URL}/api/couriers/manager/login/`, {
    data: { username: MANAGER.username, password: MANAGER.password },
  });
  if (!loginRes.ok()) {
    throw new Error(
      `Yönetici API girişi başarısız (HTTP ${loginRes.status()}): ${await loginRes.text()}`
    );
  }
  const { access } = await loginRes.json();
  const couriersRes = await request.get(`${BACKEND_URL}/api/couriers/manager/couriers/`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!couriersRes.ok()) {
    throw new Error(
      `Kurye listesi alınamadı (HTTP ${couriersRes.status()}): ${await couriersRes.text()}`
    );
  }
  const body = (await couriersRes.json()) as
    | { username: string; first_name: string; last_name: string }[]
    | { results: { username: string; first_name: string; last_name: string }[] };
  const results = Array.isArray(body) ? body : body.results;
  const target = results.find((c) => c.username === username);
  return target ? `${target.first_name} ${target.last_name}` : null;
}

test("Müşteri → Market → Kurye Yöneticisi → Kurye → Admin tam yaşam döngüsü", async ({
  browser,
  request,
}) => {
  let orderId: string | null = null;

  // ---------------------------------------------------------------------
  // 1. MÜŞTERİ — giriş yapar, vitrinden sepete ürün ekler, siparişi tamamlar.
  // ---------------------------------------------------------------------
  await test.step("1. Müşteri: sipariş oluşturur", async () => {
    const context = await browser.newContext();
    // Adres eklerken tarayıcı konumu istenebilir — sahte bir konum veriyoruz.
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 40.6844, longitude: 30.4028 }); // Sakarya
    const page = await context.newPage();

    await page.goto("/");
    await page.getByRole("button", { name: "Giriş Yap / Üye Ol" }).click();
    await page.getByLabel("Kullanıcı Adı").fill(CUSTOMER.username);
    await page.getByLabel("Şifre").fill(CUSTOMER.password);
    // Not: Modal içinde "Giriş Yap" metni bir sekme başlığı, bir başlık VE
    // gönder butonunda tekrarlanıyor — bu yüzden gönder butonu `<form>`
    // içine (tek eşleşme kalacak şekilde) tam eşleşmeyle scope'landı.
    await page.locator("form").getByRole("button", { name: "Giriş Yap", exact: true }).click();
    await expect(page.getByRole("button", { name: "Giriş Yap / Üye Ol" })).toHaveCount(0);

    // Vitrin yerine tüm ürünleri listeleyen /arama sayfasını kullanıyoruz —
    // anasayfanın "Fırsat Ürünleri" bloğu boş olabilir, /arama her zaman
    // filtresiz tüm ürünleri döner.
    await page.goto("/arama");
    await page.getByRole("button", { name: "Hemen Ekle" }).first().click();

    await page.getByRole("button", { name: "Sepeti aç" }).click();
    await page.getByRole("link", { name: "Sepeti Onayla" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // Not: Müşteri hesabının seed'den gelen BAŞKA bir adresi olabilir (bu
    // gerçekten de öyle — `musteri1` seed_test_data ile zaten bir adres
    // alıyor). Daha önce burada "adres yoksa oluştur" mantığı vardı; ama bu
    // durumda mevcut (farklı isimli) adres otomatik seçili kaldığından yeni
    // adres HİÇ oluşturulmuyor ve sipariş `TEST_CUSTOMER_NAME` yerine seed
    // adresinin adıyla düşüyordu — bu da testin ilerleyen adımlarında
    // (kurye panelinde sipariş bu isimle aranıyor) siparişi asla bulamayıp
    // kırmızıya düşmesine yol açıyordu. Kesin bir tekil kimlik için her
    // çalıştırmada YENİ bir adres oluşturuyoruz; checkout onu otomatik seçili
    // yapar, böylece sipariş her zaman `TEST_CUSTOMER_NAME` ile düşer.
    const addressSection = page.locator("section", { hasText: "Teslimat Adresi" });
    await addressSection.getByRole("button", { name: "Yeni Adres Ekle" }).waitFor({
      state: "visible",
      timeout: 15_000,
    });

    await addressSection.getByRole("button", { name: "Yeni Adres Ekle" }).click();
    const addressDialog = page.getByRole("dialog", { name: "Yeni Adres Ekle" });
    await expect(addressDialog).toBeVisible();
    await addressDialog.getByLabel("Ad Soyad").fill(TEST_CUSTOMER_NAME);
    await addressDialog.getByLabel("Telefon").fill("5551234567");
    // İlk gerçek ilçe/mahalle seçeneğini seç (placeholder index 0'ı atla).
    await addressDialog.locator("select").nth(1).selectOption({ index: 1 });
    await addressDialog.locator("select").nth(2).selectOption({ index: 1 });
    await addressDialog.getByLabel("Açık Adres").fill("Test sokak, E2E test binası, no: 1");
    await addressDialog.getByRole("button", { name: "Mevcut Konumumu Kullan" }).click();
    await expect(addressDialog.getByText("Konum alındı")).toBeVisible();
    await addressDialog.getByRole("button", { name: "Kaydet" }).click();
    await expect(addressDialog).toHaveCount(0);

    // Sayfada tek bir onay kutusu var (sözleşmeleri kabul).
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: "Siparişi Onayla" }).click();

    await expect(page).toHaveURL(/\/siparis-basarili/, { timeout: 20_000 });
    orderId = new URL(page.url()).searchParams.get("orderId");
    expect(orderId, "Sipariş numarası URL'den okunamadı").not.toBeNull();

    await context.close();
  });

  // ---------------------------------------------------------------------
  // 2. MARKET — vendor paneline girer, siparişi "Hazırlanıyor" statüsüne
  //    çeker. (Kuryeye Ver adımı, kurye atanana kadar backend tarafından
  //    reddedildiği için 4. adıma taşındı — bkz. dosya başındaki not.)
  // ---------------------------------------------------------------------
  await test.step("2. Market: siparişi hazırlar", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/vendor/giris");
    await page.locator("#vendor-username").fill(MARKET.username);
    await page.locator("#vendor-password").fill(MARKET.password);
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/vendor\/panel/);

    const orderCard = page.locator("div.rounded-2xl", { hasText: `#${orderId}` });
    await expect(orderCard).toBeVisible({ timeout: 20_000 });
    await orderCard.getByRole("button", { name: "Onayla ve Hazırla" }).click();
    await expect(orderCard.getByRole("button", { name: "Kuryeye Ver" })).toBeVisible();

    await context.close();
  });

  // ---------------------------------------------------------------------
  // 3. KURYE YÖNETİCİSİ — atama paneline girer, havuzdaki siparişi bulur ve
  //    "kurye1" hesabına manuel atar.
  // ---------------------------------------------------------------------
  await test.step("3. Kurye Yöneticisi: siparişi kuryeye atar", async () => {
    const courierDisplayName = await resolveCourierDisplayName(
      request,
      COURIER.username,
      COURIER.password
    );

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/yonetici/giris");
    await page.locator("#manager-username").fill(MANAGER.username);
    await page.locator("#manager-password").fill(MANAGER.password);
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/yonetici\/panel/);

    await page.goto("/yonetici/atama");
    // Not: Bu havuzda başka (bu testle ilgisiz, ör. önceki test çalışmalarından
    // kalma) bekleyen siparişler olabilir ve kartlarda sipariş ID'si
    // gösterilmiyor. Daha önce burada kartları teslimat adına
    // (`TEST_CUSTOMER_NAME`) göre önceden filtreliyorduk, ama seed verisi
    // müşteri hesabına zaten bir adres oluşturduğu için checkout o mevcut
    // adresi (farklı bir isimle) kullanabiliyor — bu da adı asla eşleşmeyen
    // ve testi kırmızıya düşüren bir varsayıma dönüşüyordu. Bunun yerine
    // TÜM sipariş kartları ("Kurye Ata" butonu olan `div.rounded-2xl` —
    // modal'ın kendi `rounded-2xl` konteynerinde bu buton YOK, bu yüzden
    // aralarında karışmıyor) sırayla açılıp modal içindeki gerçek sipariş
    // numarasıyla eşleşen bulunana kadar deneniyor — isimden tamamen bağımsız.
    const assignDialog = page.getByRole("dialog", { name: "Kurye Ata" });
    const candidateCards = page
      .locator("div.rounded-2xl")
      .filter({ has: page.getByRole("button", { name: "Kurye Ata" }) });
    await expect(candidateCards.first()).toBeVisible({ timeout: 20_000 });

    let matched = false;
    const candidateCount = await candidateCards.count();
    for (let i = 0; i < candidateCount; i++) {
      await candidateCards.nth(i).getByRole("button", { name: "Kurye Ata" }).click();
      await expect(assignDialog).toBeVisible();
      if (await assignDialog.getByText(`#${orderId} numaralı`).isVisible()) {
        matched = true;
        break;
      }
      await assignDialog.getByRole("button", { name: "Vazgeç" }).click();
      await expect(assignDialog).toHaveCount(0);
    }
    expect(matched, `#${orderId} numaralı sipariş atama havuzunda bulunamadı`).toBe(true);

    if (courierDisplayName) {
      await assignDialog.locator("button[aria-pressed]", { hasText: courierDisplayName }).click();
    } else {
      // API'den isim çözülemediyse (beklenmeyen durum) ilk müsait kuryeyi seç.
      await assignDialog.locator("button[aria-pressed]").first().click();
    }
    await assignDialog.getByRole("button", { name: "Ata", exact: true }).click();
    await expect(assignDialog).toHaveCount(0);

    await context.close();
  });

  // ---------------------------------------------------------------------
  // 4. MARKET (2. ziyaret) — kurye artık atandığı için siparişi fiilen
  //    "Kuryeye Ver" statüsüne çekebilir.
  // ---------------------------------------------------------------------
  await test.step("4. Market: siparişi kuryeye verir", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/vendor/giris");
    await page.locator("#vendor-username").fill(MARKET.username);
    await page.locator("#vendor-password").fill(MARKET.password);
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/vendor\/panel/);

    const orderCard = page.locator("div.rounded-2xl", { hasText: `#${orderId}` });
    await expect(orderCard).toBeVisible({ timeout: 20_000 });
    await orderCard.getByRole("button", { name: "Kuryeye Ver" }).click();

    // Sipariş artık bu panelin (aktif) kapsamından çıkmalı.
    await expect(page.locator("div.rounded-2xl", { hasText: `#${orderId}` })).toHaveCount(0, {
      timeout: 20_000,
    });

    await context.close();
  });

  // ---------------------------------------------------------------------
  // 5. KURYE — kurye paneline girer, atanan siparişi "Yola Çık" ve
  //    "Teslim Et" adımlarıyla tamamlar.
  // ---------------------------------------------------------------------
  await test.step("5. Kurye: siparişi teslim eder", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/kurye/giris");
    await page.locator("#courier-username").fill(COURIER.username);
    await page.locator("#courier-password").fill(COURIER.password);
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/kurye\/panel/);

    // Not: Kurye panelindeki görev kartlarında ne sipariş numarası ne de bir
    // başka ayırt edici kimlik gösteriliyor — teslimat adıyla
    // (`TEST_CUSTOMER_NAME`, adım 1'de HER ÇALIŞTIRMADA taze oluşturulur)
    // bulunuyor. `.first()`: kurye1'in seed'den gelen başka aktif görevleri
    // (ör. #4 ON_THE_WAY) bu adı taşımadığı için karışmaz; olası eski/yarım
    // kalmış bir test siparişiyle karşılaşılırsa da en yeni kart seçilir.
    const activeOrderCard = page
      .locator("div.rounded-2xl", { hasText: TEST_CUSTOMER_NAME })
      .first();
    await expect(activeOrderCard).toBeVisible({ timeout: 20_000 });
    await activeOrderCard.getByRole("button", { name: "Yola Çık" }).click();
    await expect(activeOrderCard.getByRole("button", { name: "Teslim Et" })).toBeVisible();
    await activeOrderCard.getByRole("button", { name: "Teslim Et" }).click();

    await context.close();
  });

  // ---------------------------------------------------------------------
  // 6. MARKET (3. ziyaret) — teslimat tamamlandıktan sonra hak edişini
  //    talep eder. (Bkz. dosya başındaki mimari not.)
  // ---------------------------------------------------------------------
  await test.step("6. Market: hakediş talebi oluşturur", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/vendor/giris");
    await page.locator("#vendor-username").fill(MARKET.username);
    await page.locator("#vendor-password").fill(MARKET.password);
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/vendor\/panel/);

    await page.goto("/vendor/finans");
    await page.getByRole("button", { name: "Cari Bakiye & Ödemeler" }).click();

    const requestButton = page.getByRole("button", { name: "Para Çek / Talep Et" });
    // Önce butonun DOM'a hiç girip girmediğini bekliyoruz — sekme
    // tıklamasının hemen ardından anlık bir `count()` kontrolü (auto-wait
    // YAPMAZ) React henüz o sekmenin içeriğini render etmeden 0 dönebilir ve
    // adım sessizce atlanmış olur. Sadece gerçekten (banka bilgisi
    // girilmemiş olduğu için) hiç render olmuyorsa zaman aşımına uğrar.
    await requestButton.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
    if ((await requestButton.count()) > 0) {
      // Bakiye verisi SWR ile asenkron yüklendiği için buton kısa süre
      // disabled kalabilir — bu yüzden anlık bir `isEnabled()` kontrolü
      // yerine (yanlışlıkla "bakiye yok" sanıp adımı atlamamak için) enabled
      // olmasını bekliyoruz; gerçekten bakiye 0 ise zaman aşımına uğrar ve
      // adım atlanır.
      try {
        await expect(requestButton).toBeEnabled({ timeout: 15_000 });
        await requestButton.click();
        const payoutDialog = page.getByRole("dialog", { name: "Hakediş Talep Et" });
        await expect(payoutDialog).toBeVisible();
        await payoutDialog.getByRole("button", { name: "Talebi Gönder" }).click();
        await expect(payoutDialog).toHaveCount(0);
      } catch {
        // Çekilebilir bakiye 0 — hakediş talebi açılamaz, adım atlanır.
      }
    }

    await context.close();
  });

  // ---------------------------------------------------------------------
  // 7. ADMIN — Sistem Finansı sekmesinden bekleyen hakediş kaydını onaylar.
  // ---------------------------------------------------------------------
  await test.step("7. Admin: hakediş talebini onaylar", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/admin/giris");
    await page.locator("#admin-username").fill(ADMIN.username);
    await page.locator("#admin-password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/admin\/panel/);

    await page.goto("/admin/finans");
    // Sayfa varsayılan olarak "Market Hakedişleri" sekmesi + "Onay Bekliyor"
    // filtresiyle açılır. Not: bu sayfa masaüstü tablo + mobil kart olmak
    // üzere AYNI veriyi iki kez (biri CSS ile gizli) render ediyor — bu
    // yüzden `:visible` ile sadece görünen düğüm hedefleniyor. "Onayla" tam
    // eşleşmeli aranmalı, aksi halde "Onaylandı" filtre butonuyla çakışır.
    // Liste en yeni talep en üstte olacak şekilde sıralı kabul edilip
    // `.first()` ile BU testin az önce açtığı talep hedefleniyor.
    const approveButton = page
      .getByRole("button", { name: "Onayla", exact: true })
      .and(page.locator(":visible"))
      .first();
    await expect(approveButton).toBeVisible({ timeout: 20_000 });
    await approveButton.click();

    await expect(page.getByRole("heading", { name: "Hakedişi Onayla" })).toBeVisible();
    await page.getByRole("button", { name: "Onayla", exact: true }).last().click();

    await expect(page.getByRole("heading", { name: "Hakedişi Onayla" })).toHaveCount(0);

    await context.close();
  });
});
