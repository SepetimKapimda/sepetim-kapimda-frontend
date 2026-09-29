import { create } from "zustand";
import { apiClient, ApiError } from "@/lib/apiClient";
import { clearTokens, setTokens } from "@/lib/tokenStorage";
import { useCartStore } from "@/store/useCartStore";
import { useAddressStore } from "@/store/useAddressStore";

export type UserRole =
  | "CUSTOMER"
  | "COURIER"
  | "COURIER_MANAGER"
  | "MARKET_OWNER"
  | "ADMIN";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  role: UserRole;
}

// FRONTEND_API_REQUIREMENTS.md "Müşteri Girişi"
interface CustomerLoginResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  refresh: string;
  access: string;
}

// schema.yaml "Login" + market/kurye/yönetici/admin girişlerinin ortak yanıt şekli.
interface RoleLoginResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  refresh: string;
  access: string;
}

// FRONTEND_CHANGES.md §9.1 "Profil — /api/users/me/"
interface CurrentUserResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  role: UserRole;
  is_staff: boolean;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  firstName: string;
  lastName: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptsMarketing: boolean;
}

function mapCurrentUser(data: CurrentUserResponse): AuthUser {
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    phoneNumber: data.phone_number,
    role: data.role,
  };
}

// DEV-ONLY: kurye/yönetici/market/admin girişleri henüz gerçek uçlara
// bağlanmadı (bkz. entegrasyon yol haritası, Faz 4-6); bu roller ve
// DevRoleSwitcher'daki hızlı "Müşteri" önizlemesi `setRole` ile sahte
// oturum açmaya devam eder — gerçek müşteri girişi AuthModal üzerinden
// `loginCustomer`/`registerCustomer` ile yapılır.
const mockUsersByRole: Record<UserRole, { id: number; username: string }> = {
  CUSTOMER: { id: 1, username: "Servet" },
  COURIER: { id: 101, username: "Ahmet (Kurye)" },
  COURIER_MANAGER: { id: 201, username: "Mehmet (Kurye Yöneticisi)" },
  MARKET_OWNER: { id: 301, username: "Ayşe (Market Sahibi)" },
  ADMIN: { id: 401, username: "Emirhan (Sistem Yöneticisi)" },
};

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authError: string | null;
  /**
   * `AuthBootstrap` localStorage'daki token'dan oturumu geri yüklerken `true`
   * kalır. Rol korumalı layout'lar bu bayrak `true` iken henüz "giriş yapılmamış"
   * sonucuna varıp login sayfasına yönlendirmemeli — aksi halde geçerli bir
   * oturumu olan kullanıcı her sayfa yenilemesinde (`fetchCurrentUser` ağ
   * isteği tamamlanmadan) yanlışlıkla dışarı atılır.
   */
  isBootstrapping: boolean;
  finishBootstrap: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  loginCustomer: (username: string, password: string) => Promise<void>;
  loginMarket: (username: string, password: string) => Promise<void>;
  loginCourier: (username: string, password: string) => Promise<void>;
  loginManager: (username: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  registerCustomer: (payload: RegisterPayload) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  logout: () => void;
  /** DEV-ONLY: gerçek API entegrasyonu tamamlanana kadar rol sahte olarak değiştirilir. */
  setRole: (role: UserRole) => void;
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isAuthModalOpen: false,
  authError: null,
  isBootstrapping: true,

  finishBootstrap: () => set({ isBootstrapping: false }),
  openAuthModal: () => set({ isAuthModalOpen: true, authError: null }),
  closeAuthModal: () => set({ isAuthModalOpen: false, authError: null }),

  loginCustomer: async (username, password) => {
    set({ authError: null });
    try {
      const data = await apiClient.post<CustomerLoginResponse>(
        "/api/users/login/",
        { username, password },
        { skipAuth: true }
      );
      setTokens({ access: data.access, refresh: data.refresh });
      await get().fetchCurrentUser();
      set({ isAuthModalOpen: false });
    } catch (error) {
      set({ authError: resolveErrorMessage(error, "Giriş yapılamadı. Lütfen tekrar deneyin.") });
      throw error;
    }
  },

  loginMarket: async (username, password) => {
    set({ authError: null });
    try {
      const data = await apiClient.post<RoleLoginResponse>(
        "/api/markets/login/",
        { username, password },
        { skipAuth: true }
      );
      setTokens({ access: data.access, refresh: data.refresh });
      await get().fetchCurrentUser();
    } catch (error) {
      set({ authError: resolveErrorMessage(error, "Giriş yapılamadı. Lütfen tekrar deneyin.") });
      throw error;
    }
  },

  loginCourier: async (username, password) => {
    set({ authError: null });
    try {
      const data = await apiClient.post<RoleLoginResponse>(
        "/api/couriers/login/",
        { username, password },
        { skipAuth: true }
      );
      setTokens({ access: data.access, refresh: data.refresh });
      await get().fetchCurrentUser();
    } catch (error) {
      set({ authError: resolveErrorMessage(error, "Giriş yapılamadı. Lütfen tekrar deneyin.") });
      throw error;
    }
  },

  loginManager: async (username, password) => {
    set({ authError: null });
    try {
      const data = await apiClient.post<RoleLoginResponse>(
        "/api/couriers/manager/login/",
        { username, password },
        { skipAuth: true }
      );
      setTokens({ access: data.access, refresh: data.refresh });
      await get().fetchCurrentUser();
    } catch (error) {
      set({ authError: resolveErrorMessage(error, "Giriş yapılamadı. Lütfen tekrar deneyin.") });
      throw error;
    }
  },

  loginAdmin: async (username, password) => {
    set({ authError: null });
    try {
      const data = await apiClient.post<RoleLoginResponse>(
        "/api/users/admin-login/",
        { username, password },
        { skipAuth: true }
      );
      setTokens({ access: data.access, refresh: data.refresh });
      await get().fetchCurrentUser();
    } catch (error) {
      set({ authError: resolveErrorMessage(error, "Giriş yapılamadı. Lütfen tekrar deneyin.") });
      throw error;
    }
  },

  registerCustomer: async (payload) => {
    set({ authError: null });
    try {
      await apiClient.post(
        "/api/users/register/",
        {
          username: payload.username,
          email: payload.email,
          password: payload.password,
          password_confirm: payload.passwordConfirm,
          first_name: payload.firstName,
          last_name: payload.lastName,
          accepted_terms: payload.acceptedTerms,
          accepted_privacy: payload.acceptedPrivacy,
          accepts_marketing: payload.acceptsMarketing,
        },
        { skipAuth: true }
      );
      // Kayıt ucu token dönmüyor (FRONTEND_API_REQUIREMENTS.md), bu yüzden
      // kayıt sonrası aynı bilgilerle giriş yapılıp oturum açılır.
      await get().loginCustomer(payload.username, payload.password);
    } catch (error) {
      set({ authError: resolveErrorMessage(error, "Kayıt oluşturulamadı. Lütfen tekrar deneyin.") });
      throw error;
    }
  },

  fetchCurrentUser: async () => {
    const data = await apiClient.get<CurrentUserResponse>("/api/users/me/");
    set({ user: mapCurrentUser(data), isAuthenticated: true });
    // Sepet ve adresler sadece müşteri rolünde vardır (market/kurye/yönetici/admin hesaplarında yok).
    if (data.role === "CUSTOMER") {
      useCartStore.getState().fetchCart().catch(() => {
        // Sepet alınamadı — ilgili ekran (CartDrawer/checkout) kendi hata durumunu yönetir.
      });
      useAddressStore.getState().fetchAddresses();
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
    useCartStore.getState().resetCart();
    useAddressStore.getState().resetAddresses();
  },

  setRole: (role) =>
    set({
      user: {
        ...mockUsersByRole[role],
        email: "",
        firstName: "",
        lastName: "",
        phoneNumber: null,
        role,
      },
      isAuthenticated: true,
      isAuthModalOpen: false,
    }),
}));
