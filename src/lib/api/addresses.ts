import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";

export interface Address {
  id: number;
  full_name: string;
  phone?: string | null;
  district: string;
  district_display: string;
  neighborhood: string;
  neighborhood_display: string;
  city: string;
  address_type: "home" | "work" | "billing";
  street?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

export interface CreateAddressPayload {
  full_name: string;
  phone: string;
  street: string;
  district: string;
  neighborhood: string;
  address_type: Address["address_type"];
  latitude: number;
  longitude: number;
}

// FRONTEND_CHANGES.md §5.1: liste artık sayfalı ({count,next,previous,results}).
export async function fetchAddresses(): Promise<Address[]> {
  const data = await apiClient.get<PaginatedResponse<Address> | Address[]>(
    "/api/addresses/?page_size=50"
  );
  return Array.isArray(data) ? data : data.results;
}

export function createAddress(payload: CreateAddressPayload): Promise<Address> {
  return apiClient.post<Address>("/api/addresses/", payload);
}

export function updateAddress(
  id: number,
  payload: Partial<CreateAddressPayload>
): Promise<Address> {
  return apiClient.put<Address>(`/api/addresses/${id}`, payload);
}

export function deleteAddress(id: number): Promise<void> {
  return apiClient.delete<void>(`/api/addresses/${id}`);
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface DistrictLocation extends LocationOption {
  neighborhoods: LocationOption[];
}

export interface AddressLocations {
  city: string;
  districts: DistrictLocation[];
}

// Herkese açık (oturum gerekmez) — ilçe/mahalle etiketleri de backend'den gelir,
// yeni bir ilçe eklendiğinde frontend'de sabit bir liste güncellemeye gerek kalmaz.
export function fetchAddressLocations(): Promise<AddressLocations> {
  return apiClient.get<AddressLocations>("/api/addresses/locations/");
}
