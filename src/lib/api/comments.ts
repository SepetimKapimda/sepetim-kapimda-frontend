import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

// FRONTEND_CHANGES.md §7.5 + canlı OpenAPI şeması (ProductReview/ProductReviewCreate):
// alan adı `text` değil `comment`; `order_item` zorunlu, `product`/`user` gönderilmez.
export interface ProductReview {
  id: number;
  product: number;
  order_item: number | null;
  user: number;
  user_display_name: string;
  rating: number;
  comment: string | null;
  created: string;
}

export interface CreateCommentPayload {
  orderItemId: number;
  rating: number;
  comment?: string;
}

export function createComment({
  orderItemId,
  rating,
  comment,
}: CreateCommentPayload): Promise<ProductReview> {
  return apiClient.post<ProductReview>("/api/comments/", {
    order_item: orderItemId,
    rating,
    comment: comment || null,
  });
}

// `?user=<id>` ile giriş yapan müşterinin kendi değerlendirmeleri filtrelenir.
export async function fetchMyComments(userId: number): Promise<ProductReview[]> {
  const data = await apiClient.get<PaginatedResponse<ProductReview>>(
    `/api/comments/?user=${userId}&page_size=100`
  );
  return data.results;
}

export interface UpdateCommentPayload {
  rating: number;
  comment?: string | null;
}

// Ürün ve sipariş kalemi değiştirilemez, sadece puan/yorum güncellenir.
export function updateComment(
  commentId: number,
  payload: UpdateCommentPayload
): Promise<ProductReview> {
  return apiClient.patch<ProductReview>(`/api/comments/${commentId}`, payload);
}

export function deleteComment(commentId: number): Promise<void> {
  return apiClient.delete<void>(`/api/comments/${commentId}`);
}
