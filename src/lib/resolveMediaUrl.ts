import { API_BASE_URL } from "./apiConfig";

// Backend genelde mutlak URL döner (`http://127.0.0.1:8000/media/...`), ama
// bazı ortamlarda (örn. farklı bir host/proxy arkasında) relative (`/media/...`)
// dönebilir. `next/image` relative bir yolu yerel `public/` klasöründe arar ve
// bulamayınca görsel kırık/boş görünür — bu yüzden burada mutlaklaştırılıyor.
export function resolveMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Next.js'in sunucu taraflı görsel optimizasyonu, bu ortamda Supabase
// Storage'a giden dış isteği TCP seviyesinde kuramıyor (Node'un ağ yığınıyla
// ilgili bir sorun — `curl`/tarayıcı aynı URL'e sorunsuz erişiyor,
// `next.config.mjs`'deki `remotePatterns` doğru) ve bu yüzden optimizasyon
// sürekli 500 dönüp görseli tamamen kırıyor. Kalıcı ağ/güvenlik yazılımı
// sorunu çözülene kadar Supabase kaynaklı görsellerde `unoptimized` ile
// optimizasyon atlanıyor — tarayıcı görseli doğrudan (optimize edilmeden)
// Supabase'den çeker; boyutlandırma/format dönüştürme faydası bu görsellerde
// geçici olarak kayboluyor.
export function isSupabaseUrl(url: string): boolean {
  return /\.supabase\.co\//i.test(url);
}
