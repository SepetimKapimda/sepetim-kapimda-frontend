import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

// schema.yaml MarketProduct — market panelindeki ürün kartı (aktif+pasif, tüm fiyat/stok/görsel alanları).
export interface VendorProductImage {
  id: number;
  image: string;
  alt_text: string | null;
  is_primary: boolean;
}

export interface VendorProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: number;
  category_name: string;
  market_price: string;
  discount_price: string | null;
  selling_price: string;
  original_price: string | null;
  discount_percent: number | null;
  stock: number;
  is_active: boolean;
  is_home: boolean;
  images: VendorProductImage[];
}

// schema.yaml MarketProductWrite — market fiyatı gönderilir, müşteri fiyatı markup ile hesaplanır.
export interface VendorProductWritePayload {
  name: string;
  slug?: string;
  description?: string | null;
  category: number;
  market_price: string;
  discount_price?: string | null;
  stock: number;
  is_active?: boolean;
  is_home?: boolean;
}

export interface FetchVendorProductsParams {
  isActive?: boolean;
  category?: number;
  discounted?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchVendorProducts(
  params: FetchVendorProductsParams = {}
): Promise<PaginatedResponse<VendorProduct>> {
  const query = new URLSearchParams();
  if (params.isActive !== undefined) query.set("is_active", String(params.isActive));
  if (params.category !== undefined) query.set("category", String(params.category));
  if (params.discounted !== undefined) query.set("discounted", String(params.discounted));
  if (params.q) query.set("q", params.q);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 20));
  return apiClient.get<PaginatedResponse<VendorProduct>>(`/api/markets/products/?${query.toString()}`);
}

// Ürün alanlarını ve (varsa) yeni görselleri TEK bir multipart/form-data
// isteğine dönüştürür — backend `uploaded_images` alanını bir dosya dizisi
// olarak bekliyor. Not: FormData yalnızca string/Blob taşıyabildiği için
// `discount_price` alanını temizlemek (null göndermek) burada mümkün değil;
// bu yalnızca görsel olmadan (düz JSON PATCH ile) yapılan düzenlemelerde
// desteklenir — aynı anda hem yeni görsel eklenip hem indirimli fiyatın
// temizlenmesi gereken nadir durum bilinen bir kısıttır.
function buildProductFormData(
  payload: Partial<VendorProductWritePayload>,
  images: File[]
): FormData {
  const formData = new FormData();
  if (payload.name !== undefined) formData.append("name", payload.name);
  if (payload.slug) formData.append("slug", payload.slug);
  if (payload.description) formData.append("description", payload.description);
  if (payload.category !== undefined) formData.append("category", String(payload.category));
  if (payload.market_price !== undefined) formData.append("market_price", payload.market_price);
  if (payload.discount_price) formData.append("discount_price", payload.discount_price);
  if (payload.stock !== undefined) formData.append("stock", String(payload.stock));
  if (payload.is_active !== undefined) formData.append("is_active", String(payload.is_active));
  if (payload.is_home !== undefined) formData.append("is_home", String(payload.is_home));
  images.forEach((file) => formData.append("uploaded_images", file));
  return formData;
}

export function createVendorProduct(
  payload: VendorProductWritePayload,
  images: File[] = []
): Promise<VendorProduct> {
  if (images.length === 0) {
    return apiClient.post<VendorProduct>("/api/markets/products/", payload);
  }
  return apiClient.post<VendorProduct>(
    "/api/markets/products/",
    buildProductFormData(payload, images)
  );
}

export function updateVendorProduct(
  productId: number,
  payload: Partial<VendorProductWritePayload>,
  images: File[] = []
): Promise<VendorProduct> {
  if (images.length === 0) {
    return apiClient.patch<VendorProduct>(`/api/markets/products/${productId}/`, payload);
  }
  return apiClient.patch<VendorProduct>(
    `/api/markets/products/${productId}/`,
    buildProductFormData(payload, images)
  );
}

// Soft delete: ürün silinmez, is_active=false ve is_home=false yapılır.
export function deleteVendorProduct(productId: number): Promise<void> {
  return apiClient.delete<void>(`/api/markets/products/${productId}/`);
}

export function setVendorProductImagePrimary(imageId: number): Promise<VendorProductImage> {
  return apiClient.patch<VendorProductImage>(`/api/markets/products/images/${imageId}/`, {
    is_primary: true,
  });
}

export function deleteVendorProductImage(imageId: number): Promise<void> {
  return apiClient.delete<void>(`/api/markets/products/images/${imageId}/`);
}

// --- Kategoriler ---

export interface VendorCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  parent: number | null;
  product_count: number;
}

export interface VendorCategoryWritePayload {
  name: string;
  slug?: string;
  icon?: string;
  description?: string | null;
  parent?: number | null;
}

export async function fetchVendorCategories(): Promise<VendorCategory[]> {
  const data = await apiClient.get<PaginatedResponse<VendorCategory>>(
    "/api/markets/categories/?page_size=100"
  );
  return data.results;
}

export function createVendorCategory(payload: VendorCategoryWritePayload): Promise<VendorCategory> {
  return apiClient.post<VendorCategory>("/api/markets/categories/", payload);
}

export function deleteVendorCategory(categoryId: number): Promise<void> {
  return apiClient.delete<void>(`/api/markets/categories/${categoryId}/`);
}
