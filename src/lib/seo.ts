// Canlı domain. `sitemap.ts`, `robots.ts` ve kök `layout.tsx` aynı değeri
// kullanır ki üçü asla birbirinden sapmasın. `apiConfig.ts`'teki
// `NEXT_PUBLIC_API_BASE_URL` desenine paralel: env ile ezilebilir (önizleme/
// staging ortamları için), tanımlı değilse üretim domainine düşer.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sepetimkapimda.com";

export const SITE_NAME = "Sepetim Kapımda";
