import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

// schema.yaml DynamicPageList — Footer ve kurumsal menü için, içeriksiz.
export interface DynamicPageListItem {
  slug: string;
  title: string;
  updated_at: string;
}

export async function fetchPages(): Promise<DynamicPageListItem[]> {
  const data = await apiClient.get<PaginatedResponse<DynamicPageListItem>>(
    "/api/pages/?page_size=50"
  );
  return data.results;
}

// schema.yaml DynamicPageDetail — `content_type`/`pdf_url` sadece admin
// panelinden (bkz. `legalPages.ts`) PDF olarak yayınlanmış sayfalarda dolu
// gelir; diğer tüm sayfalar için `content_type` "html" veya boş, `pdf_url` null'dür.
export interface DynamicPageDetail {
  slug: string;
  title: string;
  content_html: string;
  content_type?: "html" | "pdf";
  pdf_url?: string | null;
  updated_at: string;
}

export function fetchPageBySlug(slug: string): Promise<DynamicPageDetail> {
  return apiClient.get<DynamicPageDetail>(`/api/pages/${slug}/`);
}
