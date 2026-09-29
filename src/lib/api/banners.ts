import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

// schema.yaml Banner
export interface ActiveBanner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image: string;
  button_text: string | null;
  link: string | null;
  order: number;
}

// schema.yaml GET /api/core/banners/ — anasayfada gösterilecek aktif afişler, sıralı.
// Anasayfa Server Component'inde SSR sırasında çağrılır; Vercel'in tek sunucu
// IP'sinden backend'i sürekli dövmemek için ISR ile 60 saniye önbelleklenir.
export async function fetchActiveBanners(): Promise<ActiveBanner[]> {
  const data = await apiClient.get<PaginatedResponse<ActiveBanner>>(
    "/api/core/banners/?page_size=20",
    { next: { revalidate: 60 } }
  );
  return data.results;
}
