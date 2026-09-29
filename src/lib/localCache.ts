// Küçük, tek-cihazlı bir `localStorage` önbelleği için genel yardımcılar.
// Sunucudan (backend) gelen gerçek değerleri, aynı tarayıcı içindeki diğer
// sekmelere/panellere anında yansıtmak amacıyla önbelleklemek için kullanılır
// (bkz. `useBrandingStore.ts`) — kalıcı/tek gerçek kaynağı DEĞİLDİR, sunucu
// verisinin bir kopyasını tutar.

export function readCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage dolu/erişilemez olabilir (gizli sekme, kota vb.) — önbellek
    // sessizce yoksayar, uygulama sunucudan gelen son bilinen state ile çalışmaya devam eder.
  }
}
