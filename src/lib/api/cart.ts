import { apiClient } from "@/lib/apiClient";

// FRONTEND_API_REQUIREMENTS.md "Sepet & Checkout" + FRONTEND_CHANGES.md §0
// (tutarlar string, product.image mutlak URL).
export interface ApiCartItem {
  id: number;
  product: {
    id: number;
    name: string;
    selling_price: string;
    image: string | null;
  };
  quantity: number;
  item_total: string;
}

export interface ApiCart {
  id: number;
  user: string;
  items: ApiCartItem[];
  cart_total: string;
}

export function fetchCart(): Promise<ApiCart> {
  return apiClient.get<ApiCart>("/api/carts/");
}

export function addCartItem(productId: number, quantity = 1): Promise<ApiCart> {
  return apiClient.post<ApiCart>("/api/carts/add", { product_id: productId, quantity });
}

export function updateCartItem(cartItemId: number, quantity: number): Promise<ApiCart> {
  return apiClient.put<ApiCart>(`/api/carts/update/${cartItemId}`, { quantity });
}

export function removeCartItem(cartItemId: number): Promise<void> {
  return apiClient.delete<void>(`/api/carts/delete/${cartItemId}`);
}

export function clearCartRequest(): Promise<void> {
  return apiClient.delete<void>("/api/carts/clear");
}
