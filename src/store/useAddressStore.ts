import { create } from "zustand";
import { fetchAddresses as fetchAddressesRequest, type Address } from "@/lib/api/addresses";
import { readCache, writeCache } from "@/lib/localCache";

// Header'daki "Teslimat adresi" dropdown'u ile Checkout'un aynı seçimi
// paylaşması için tek gerçek kaynak burasıdır. Adres LİSTESİ her zaman
// `/api/addresses/` üzerinden taze çekilir (kalıcı önbelleklenmez); yalnızca
// hangi adresin SEÇİLİ olduğu, sayfa yenilemede anında aynı seçimi
// gösterebilmek için localStorage'da tutulur (bkz. `useBrandingStore.ts`'teki
// aynı desen) — token'lar temizlenince (`logout`) bu da sıfırlanır.
const STORAGE_KEY = "sanalmarket_selected_address_id_v1";

interface AddressState {
  addresses: Address[];
  selectedAddressId: number | null;
  isLoading: boolean;
  isHydrated: boolean;
  /** İlk `fetchAddresses()` çağrısı en az bir kez tamamlandı mı (başarılı ya da başarısız) —
   *  Header bu bayrak olmadan "adres yok" boş-durumunu erken/yanlışlıkla gösteremez. */
  hasFetched: boolean;
  hydrate: () => void;
  fetchAddresses: () => Promise<void>;
  selectAddress: (id: number) => void;
  /** Checkout/Hesabım'da yeni bir adres eklendiğinde store'u ve seçimi anında günceller. */
  addAddress: (address: Address) => void;
  resetAddresses: () => void;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  selectedAddressId: null,
  isLoading: false,
  isHydrated: false,
  hasFetched: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const stored = readCache<number | null>(STORAGE_KEY, null);
    set({ selectedAddressId: stored, isHydrated: true });
  },

  fetchAddresses: async () => {
    set({ isLoading: true });
    try {
      const addresses = await fetchAddressesRequest();
      set((state) => {
        // Önceden seçili adres (localStorage'dan veya bu oturumdan) hâlâ
        // listede mi? Değilse (silinmiş vb.) ilk adrese düşülür.
        const stillExists = addresses.some((a) => a.id === state.selectedAddressId);
        const nextSelectedId = stillExists ? state.selectedAddressId : addresses[0]?.id ?? null;
        if (nextSelectedId !== state.selectedAddressId) writeCache(STORAGE_KEY, nextSelectedId);
        return { addresses, selectedAddressId: nextSelectedId, isLoading: false, hasFetched: true };
      });
    } catch {
      set({ isLoading: false, hasFetched: true });
      // Adresler alınamadı — Header sessizce boş/önceki durumla devam eder, Checkout kendi hata durumunu yönetir.
    }
  },

  selectAddress: (id) => {
    writeCache(STORAGE_KEY, id);
    set({ selectedAddressId: id });
  },

  addAddress: (address) => {
    writeCache(STORAGE_KEY, address.id);
    set((state) => ({
      addresses: [...state.addresses, address],
      selectedAddressId: address.id,
      hasFetched: true,
    }));
  },

  resetAddresses: () => {
    writeCache(STORAGE_KEY, null);
    set({ addresses: [], selectedAddressId: null, hasFetched: false });
  },
}));
