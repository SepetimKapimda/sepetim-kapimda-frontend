"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { getAccessToken, getRefreshToken } from "@/lib/tokenStorage";

// Görsel çıktısı yok — sayfa yüklendiğinde localStorage'daki token'lardan
// oturumu geri yükler ve apiClient'ın "refresh başarısız oldu" olayını
// dinleyip Zustand state'ini token'larla senkron tutar.
export default function AuthBootstrap() {
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const logout = useAuthStore((state) => state.logout);
  const finishBootstrap = useAuthStore((state) => state.finishBootstrap);

  useEffect(() => {
    const handleSessionExpired = () => logout();
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, [logout]);

  useEffect(() => {
    if (getAccessToken() || getRefreshToken()) {
      fetchCurrentUser()
        .catch(() => {
          // Token geçersiz/süresi dolmuş — apiClient zaten temizledi, sessizce çıkılmış sayılır.
        })
        .finally(() => finishBootstrap());
    } else {
      finishBootstrap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
