import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

export type PaymentMethod = "cash" | "card";

// FRONTEND_CHANGES.md §0 + §7.3: tutarlar string; is_valid/message iş kuralı
// ihlallerini (market kapalı, min. tutar altı, mesai dışı) taşır.
export interface OrderPreviewResponse {
  cart_total: string;
  distance_km: string;
  courier_fee: string;
  total_amount: string;
  eta_minutes?: number;
  min_order_amount: string;
  is_valid: boolean;
  message: string;
}

export interface PreviewOrderParams {
  deliveryAddressId: number;
  couponCode?: string | null;
}

export function previewOrder({
  deliveryAddressId,
  couponCode,
}: PreviewOrderParams): Promise<OrderPreviewResponse> {
  return apiClient.post<OrderPreviewResponse>("/api/orders/preview/", {
    delivery_address_id: deliveryAddressId,
    ...(couponCode ? { coupon_code: couponCode } : {}),
  });
}

export interface LegalDocsResponse {
  on_bilgilendirme_formu_html: string;
  mesafeli_satis_sozlesmesi_html: string;
}

export interface LegalDocsParams {
  deliveryAddressId: number;
  billingAddressId?: number;
  couponCode?: string | null;
  paymentMethod?: PaymentMethod;
}

// FRONTEND_CHANGES.md §9.1 — GET /api/orders/preview/legal-docs/
export function fetchOrderLegalDocs({
  deliveryAddressId,
  billingAddressId,
  couponCode,
  paymentMethod,
}: LegalDocsParams): Promise<LegalDocsResponse> {
  const params = new URLSearchParams({ delivery_address_id: String(deliveryAddressId) });
  if (billingAddressId) params.set("billing_address_id", String(billingAddressId));
  if (couponCode) params.set("coupon_code", couponCode);
  if (paymentMethod) params.set("payment_method", paymentMethod);
  return apiClient.get<LegalDocsResponse>(`/api/orders/preview/legal-docs/?${params.toString()}`);
}

export interface CreateOrderPayload {
  deliveryAddressId: number;
  billingAddressId: number;
  couponCode?: string | null;
  paymentMethod: PaymentMethod;
  courierNote?: string;
}

export interface CreateOrderResponse {
  message: string;
  order_id: number;
}

export type OrderStatus =
  | "RECEIVED"
  | "PREPARING"
  | "WAITING_COURIER"
  | "HANDED_TO_COURIER"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELED";

export interface OrderAddress {
  id: number;
  full_name: string;
  phone: string;
  street: string;
  district: string | null;
  district_display: string;
  neighborhood: string;
  neighborhood_display: string;
  city: string;
  postal_code: string;
  address_type: "home" | "work" | "billing";
}

export interface OrderItemProductImage {
  id: number;
  image: string;
  alt_text: string | null;
  is_primary?: boolean;
}

export interface OrderItemDetail {
  id: number;
  product: {
    id: number;
    name: string;
    selling_price: string;
    images: OrderItemProductImage[];
  };
  quantity: number;
  selling_price: string;
  /** Kalem değerlendirildiyse değerlendirmenin id'si, değilse null. */
  review_id: number | null;
}

export interface OrderDetail {
  id: number;
  user: string;
  created: string;
  updated: string;
  delivered_at: string | null;
  canceled_at: string | null;
  status: OrderStatus;
  status_display: string;
  assigned_courier: string | null;
  distance_km: string;
  customer_courier_fee: string;
  coupon_discount: string;
  order_total: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  courier_note: string | null;
  items: OrderItemDetail[];
  addresses: { delivery: OrderAddress; billing: OrderAddress };
  eta_minutes: number;
}

export function fetchOrder(orderId: number): Promise<OrderDetail> {
  return apiClient.get<OrderDetail>(`/api/orders/${orderId}`);
}

// Giriş yapmış müşterinin geçmiş tüm siparişleri (yeniden eskiye), sayfalı.
export function fetchMyOrders(page = 1, pageSize = 10): Promise<PaginatedResponse<OrderDetail>> {
  return apiClient.get<PaginatedResponse<OrderDetail>>(
    `/api/orders/?page=${page}&page_size=${pageSize}`
  );
}

// Not: Swagger'daki canlı açıklama RECEIVED/PREPARING'i iptale açık gösteriyor,
// ancak ürün ekibinin talimatı (ve FRONTEND_CHANGES.md §6.5) sadece RECEIVED'i
// izin veriyor — UI bu daha kısıtlayıcı kurala göre butonu gizler; backend
// nihayetinde PREPARING'i de kabul etse dahi UI'da göstermeyiz.
export function cancelOrder(orderId: number): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>(`/api/orders/${orderId}/cancel/`);
}

export function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  return apiClient.post<CreateOrderResponse>("/api/orders/create", {
    delivery_address_id: payload.deliveryAddressId,
    billing_address_id: payload.billingAddressId,
    // Backend `coupon_code: null` gönderilirse "boş bırakılmamalı" hatası veriyor —
    // kupon yoksa alan tamamen atlanmalı.
    ...(payload.couponCode ? { coupon_code: payload.couponCode } : {}),
    payment_method: payload.paymentMethod,
    courier_note: payload.courierNote || "",
  });
}
