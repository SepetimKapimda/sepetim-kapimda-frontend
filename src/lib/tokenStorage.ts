const ACCESS_TOKEN_KEY = "sanalmarket_access_token";
const REFRESH_TOKEN_KEY = "sanalmarket_refresh_token";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage kullanılamıyor (gizli sekme vb.) — sessizce yok say.
  }
}

function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // localStorage kullanılamıyor (gizli sekme vb.) — sessizce yok say.
  }
}

export function getAccessToken(): string | null {
  return safeGet(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return safeGet(REFRESH_TOKEN_KEY);
}

export function setTokens({ access, refresh }: { access: string; refresh?: string }) {
  safeSet(ACCESS_TOKEN_KEY, access);
  if (refresh) safeSet(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  safeRemove(ACCESS_TOKEN_KEY);
  safeRemove(REFRESH_TOKEN_KEY);
}
