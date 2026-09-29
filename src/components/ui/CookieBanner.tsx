"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "sanalmarket_cookie_consent";
type ConsentChoice = "all" | "necessary";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Tarayıcı depolamasına erişilemeyen durumlarda (gizli sekme, engellenmiş
    // site verisi vb.) banner sessizce gösterilir; tercih localStorage'a
    // yazılamasa bile sayfa işlevselliği bozulmaz.
    try {
      const existingChoice = window.localStorage.getItem(STORAGE_KEY);
      if (!existingChoice) setIsVisible(true);
    } catch {
      setIsVisible(true);
    }
  }, []);

  const saveChoice = (choice: ConsentChoice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Depolama başarısız olsa da banner bu oturum için kapanır.
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Çerez Onayı"
      className="fixed inset-x-0 bottom-0 z-[70] w-full border-t border-gray-200 bg-white shadow-[0_-8px_24px_-4px_rgba(17,24,39,0.12)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-[1536px] flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between lg:px-8">
        <div className="flex items-start gap-3 sm:items-center">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary sm:mt-0" />
          <p className="text-sm text-charcoal">
            Sizlere daha iyi bir alışveriş deneyimi sunabilmek, sepetinizi hatırlamak ve site
            trafiğimizi analiz etmek için çerezler (cookies) kullanıyoruz. Detaylı bilgi için{" "}
            <Link href="/sayfa/cerez-politikasi" className="font-bold text-primary hover:underline">
              Çerez Politikası
            </Link>
            &apos;nı inceleyebilirsiniz.
          </p>
        </div>

        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => saveChoice("necessary")}
            className="flex-1 whitespace-nowrap rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] sm:flex-none"
          >
            Sadece Zorunluları Kabul Et
          </button>
          <button
            type="button"
            onClick={() => saveChoice("all")}
            className="flex-1 whitespace-nowrap rounded-xl bg-[#FF5000] px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] sm:flex-none"
          >
            Tümünü Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
