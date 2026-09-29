import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";
import type { Product } from "@/lib/types";

export interface ApiProductImage {
  id: number;
  image: string;
  alt_text: string | null;
  is_primary?: boolean;
}

// FRONTEND_API_REQUIREMENTS.md "Anasayfa — Fırsat Ürünleri" + FRONTEND_CHANGES.md
// §7.10 (indirimli fiyat alanları) birleştirilmiş liste şeması.
export interface ApiProductListItem {
  id: number;
  name: string;
  slug: string;
  selling_price: string;
  original_price?: string | null;
  discount_percent?: number | null;
  category: string;
  images: ApiProductImage[];
  in_stock: boolean;
}

export function mapApiProductToCardProduct(item: ApiProductListItem): Product {
  // Kapak görseli olarak `is_primary` işaretli görsel önceliklidir — market
  // sahibinin panelde seçtiği kapak görseli müşteri vitrininde de aynı olmalı.
  const coverImage = item.images?.find((img) => img.is_primary) ?? item.images?.[0];
  return {
    id: String(item.id),
    slug: item.slug,
    name: item.name,
    price: Number(item.selling_price),
    oldPrice: item.original_price ? Number(item.original_price) : undefined,
    discountPercent: item.discount_percent ?? undefined,
    image: coverImage?.image || "https://placehold.co/400x400.png",
  };
}

// Anasayfa Server Component'te SSR sırasında çalışır; Vercel'in tek sunucu
// IP'sinden backend'e her istekte vurmak yerine (bkz. Locust yük testi
// bulgusu — DRF anonim hız sınırını dolduruyordu) ISR ile 60 saniye önbelleklenir.
export async function fetchHomeProducts(): Promise<Product[]> {
  const data = await apiClient.get<PaginatedResponse<ApiProductListItem>>(
    "/api/products/?is_home=true&page_size=12",
    { next: { revalidate: 60 } }
  );
  return data.results.map(mapApiProductToCardProduct);
}

export type ProductOrdering = "price" | "-price" | "name";

export interface FetchProductsParams {
  category?: string;
  q?: string;
  ordering?: ProductOrdering;
  priceGte?: number;
  priceLte?: number;
  discounted?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  count: number;
  products: Product[];
}

// schema.yaml GET /api/products/ — kategori (slug), arama, sıralama ve fiyat
// aralığı filtreleriyle sayfalı ürün listesi.
export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductListResult> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.priceGte !== undefined) query.set("price__gte", String(params.priceGte));
  if (params.priceLte !== undefined) query.set("price__lte", String(params.priceLte));
  if (params.discounted !== undefined) query.set("discounted", String(params.discounted));
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 20));
  const data = await apiClient.get<PaginatedResponse<ApiProductListItem>>(
    `/api/products/?${query.toString()}`
  );
  return { count: data.count, products: data.results.map(mapApiProductToCardProduct) };
}

// schema.yaml ProductReview — bir ürünün altındaki değerlendirme.
export interface ApiProductComment {
  id: number;
  product: number;
  order_item: number | null;
  user: number;
  user_display_name: string;
  rating: number;
  comment: string | null;
  created: string;
}

// schema.yaml ProductDetail — market_price KESİNLİKLE dönmez (müşteriye açık alanlar).
export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  selling_price: string;
  original_price: string | null;
  discount_percent: number | null;
  in_stock: boolean;
  category: number;
  images: ApiProductImage[];
  comments: ApiProductComment[];
}

// schema.yaml GET /api/products/slug/{slug}/ — `urun/[slug]` rotası için.
export function fetchProductBySlug(slug: string): Promise<ProductDetail> {
  return apiClient.get<ProductDetail>(`/api/products/slug/${slug}/`);
}

// schema.yaml GET /api/products/{id} — "Değerlendirmelerim" gibi, ürünü sadece
// ID üzerinden tanıyan ekranlarda ürün adını/slug'ını çözmek için.
export function fetchProductById(id: number): Promise<ProductDetail> {
  return apiClient.get<ProductDetail>(`/api/products/${id}`);
}
