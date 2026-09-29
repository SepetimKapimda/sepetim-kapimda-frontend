import { create } from "zustand";
import { readCache, writeCache } from "@/lib/localCache";

// `logoUrl`/`faviconUrl` backend'in GERÇEK `logo_url`/`favicon_url`
// alanlarından gelir. İki kaynağı var:
//   1. Herkese açık `GET /api/core/settings/` (bkz. `storeSettings.ts`) —
//      `BrandingBootstrap` her sayfa yüklendiğinde bunu çağırıp TÜM
//      ziyaretçiler (admin dahil değil) için store'u doldurur.
//   2. Admin-yetkili `PATCH /api/admin/settings/` (bkz. `adminSettings.ts`,
//      `/admin/ayarlar`) — admin yeni bir dosya yüklediğinde, sonraki
//      genel fetch'i beklemeden anlık geri bildirim için store doğrudan
//      güncellenir.
// Reaktivite (Navbar, Footer, tüm paneller) için değer ayrıca localStorage'da
// önbelleklenir — bu sadece ağ isteği tamamlanana kadar önceki bilinen
// değerin anında gösterilmesi içindir, tek gerçek kaynak backend'dir.
const STORAGE_KEY = "sanalmarket_branding_cache_v1";

interface BrandingPersisted {
  logoUrl: string | null;
  faviconUrl: string | null;
}

interface BrandingState extends BrandingPersisted {
  isHydrated: boolean;
  /** `localStorage`'daki son önbelleklenmiş marka varlıklarını okur (yalnızca ilk çağrıda etkilidir). */
  hydrate: () => void;
  setLogo: (url: string) => void;
  setFavicon: (url: string) => void;
}

export const useBrandingStore = create<BrandingState>((set, get) => ({
  logoUrl: null,
  faviconUrl: null,
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const stored = readCache<BrandingPersisted>(STORAGE_KEY, { logoUrl: null, faviconUrl: null });
    set({ ...stored, isHydrated: true });
  },

  setLogo: (url) => {
    const next: BrandingPersisted = { logoUrl: url, faviconUrl: get().faviconUrl };
    writeCache(STORAGE_KEY, next);
    set({ logoUrl: url });
  },

  setFavicon: (url) => {
    const next: BrandingPersisted = { logoUrl: get().logoUrl, faviconUrl: url };
    writeCache(STORAGE_KEY, next);
    set({ faviconUrl: url });
  },
}));
