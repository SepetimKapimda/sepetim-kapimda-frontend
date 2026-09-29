"use client";

import { useEffect } from "react";
import { useBrandingStore } from "@/store/useBrandingStore";
import { fetchPublicStoreSettings } from "@/lib/api/storeSettings";

// Görsel çıktısı yok. Her sayfa yüklendiğinde `GET /api/core/settings/`
// (herkese açık, oturumsuz) çağrılarak güncel logo/favicon TÜM ziyaretçiler
// için (yalnızca daha önce admin panelini ziyaret etmiş tarayıcılar için
// değil) çekilir ve `useBrandingStore`'a yazılır — Navbar/Footer'daki `Logo`
// bileşeni buradan reaktif olarak beslenir.
//
// SSR sınırı: Next.js'in Metadata API'si (`generateMetadata()`) sunucu
// tarafında, bu istemci-taraflı fetch'ten önce çalışır; bu yüzden favicon
// build/SSR anında hâlâ statik kalır. Bu yüzden admin panelinden yüklenen
// favicon, sayfa hidrate olduktan sonra `<link rel="icon">` istemci
// tarafında elle güncellenerek gösterilir — ilk SSR yanıtı bir an için hâlâ
// statik favicon'u içerir.
export default function BrandingBootstrap() {
  const hydrate = useBrandingStore((state) => state.hydrate);
  const setLogo = useBrandingStore((state) => state.setLogo);
  const setFavicon = useBrandingStore((state) => state.setFavicon);
  const faviconUrl = useBrandingStore((state) => state.faviconUrl);

  useEffect(() => {
    // Ağ isteği tamamlanana kadar önbellekteki (varsa) son bilinen değer
    // anında gösterilsin diye önce localStorage'dan okunur.
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    fetchPublicStoreSettings()
      .then((settings) => {
        if (settings.logo_url) setLogo(settings.logo_url);
        if (settings.favicon_url) setFavicon(settings.favicon_url);
      })
      .catch(() => {
        // Ayarlar alınamadı — önbellekteki veya statik varsayılan logo/favicon ile devam edilir.
      });
  }, [setLogo, setFavicon]);

  useEffect(() => {
    if (!faviconUrl) return;
    const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    links.forEach((link) => {
      link.href = faviconUrl;
    });
  }, [faviconUrl]);

  return null;
}
