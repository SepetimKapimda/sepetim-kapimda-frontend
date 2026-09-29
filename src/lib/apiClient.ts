import { API_BASE_URL } from "./apiConfig";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokenStorage";

// FRONTEND_CHANGES.md §0: istisnasız tüm hata yanıtları bu zarfla döner.
interface ErrorEnvelope {
  success: false;
  error: { message: string; status_code: number };
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Login/register/refresh uçları için: token eklenmez, 401'de yenileme denenmez. */
  skipAuth?: boolean;
  /** Dahili kullanım — refresh sonrası tekrar denemeyi bir kereyle sınırlar. */
  isRetry?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

// Aynı anda birden fazla istek 401 alırsa tek bir refresh çağrısı paylaşılır.
async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/users/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { access: string };
        setTokens({ access: data.access, refresh });
        return data.access;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, skipAuth, isRetry, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(headers as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  // Varsayılan: hiç önbelleklenmez (sipariş/stok/fiyat gibi canlı ve kişiye
  // özel veriler için bu şart). Ancak çağıran taraf `cache` veya `next`
  // (ör. `next: { revalidate: 60 }`) belirtmişse bu varsayılan devre dışı
  // bırakılır — Next.js aynı fetch'te `cache: "no-store"` ile `next.revalidate`
  // birlikte verilirse hata fırlatır, bu yüzden ikisi asla birlikte set edilmez.
  const hasExplicitCaching = rest.cache !== undefined || rest.next !== undefined;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...(hasExplicitCaching ? {} : { cache: "no-store" as RequestCache }),
    ...rest,
    headers: finalHeaders,
    body:
      body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 401 && !skipAuth && !isRetry) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      return apiRequest<T>(path, { ...options, isRetry: true });
    }
    clearTokens();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:session-expired"));
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(payload, res.status), res.status);
  }

  return payload as T;
}

// Bazı uçlar (örn. `/api/users/register/`) §0 zarfını kullansa da DRF'in alan
// adını mesajın önüne "alan_adı: mesaj" şeklinde gömüyor (örn.
// "password_confirm: Şifreler eşleşmiyor"). Kullanıcıya İngilizce alan adı
// değil sadece Türkçe mesaj gösterilmeli, bu yüzden bu ön eki temizliyoruz.
const FIELD_PREFIX_PATTERN = /^[a-z][a-z0-9_]*:\s+/;

function stripFieldPrefix(message: string): string {
  return message.replace(FIELD_PREFIX_PATTERN, "");
}

// Neredeyse tüm uçlar §0'daki {success:false, error:{message,status_code}}
// zarfını kullanır, ama örn. `/api/users/change-password/` gibi bazı DRF
// serializer'ları alan bazlı düz hata döner: {"old_password": "Eski şifre yanlış"}.
function extractErrorMessage(payload: unknown, status: number): string {
  const envelope = payload as Partial<ErrorEnvelope> | null;
  if (envelope?.error?.message) return stripFieldPrefix(envelope.error.message);

  if (payload && typeof payload === "object") {
    const firstValue = Object.values(payload as Record<string, unknown>)[0];
    if (typeof firstValue === "string") return stripFieldPrefix(firstValue);
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return stripFieldPrefix(firstValue[0]);
    }
  }

  return `İstek başarısız oldu (HTTP ${status}).`;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
