import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";
import type { ApiProductListItem } from "@/lib/api/products";

// schema.yaml Category
export interface CategoryListItem {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

// GET /api/categories/ — herkese açık, tüm kategoriler (Navbar arama önerileri
// ve genel kategori menüleri için).
export async function fetchCategories(): Promise<CategoryListItem[]> {
  const data = await apiClient.get<PaginatedResponse<CategoryListItem>>(
    "/api/categories/?page_size=100"
  );
  return data.results;
}

// schema.yaml CategoryDetail — GET /api/categories/{slug} ("kategoriler/[slug]"
// rotası için özel olarak yazılmış). `products` burada SAYFASIZ döner; gerçek
// sayfalı/filtreli ürün listesi için GET /api/products/?category={slug} kullanılır.
export interface CategoryDetail {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  products: ApiProductListItem[];
}

export function fetchCategoryBySlug(slug: string): Promise<CategoryDetail> {
  return apiClient.get<CategoryDetail>(`/api/categories/${slug}`);
}

// Ürün detayında (`ProductDetail.category` sadece id döner) kırıntı menüsü
// (breadcrumb) için kategori adını/slug'ını çözmekte kullanılır.
export function fetchCategoryById(id: number): Promise<CategoryDetail> {
  return apiClient.get<CategoryDetail>(`/api/categories/${id}`);
}
