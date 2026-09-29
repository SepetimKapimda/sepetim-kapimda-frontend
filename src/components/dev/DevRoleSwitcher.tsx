"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Truck, Users, Store, ShieldCheck, Landmark, X, LogOut, ArrowRight } from "lucide-react";
import { useAuthStore, type UserRole } from "@/store/useAuthStore";

const roleOptions: { role: UserRole; label: string; icon: typeof Truck }[] = [
  { role: "CUSTOMER", label: "Müşteri", icon: Users },
  { role: "COURIER", label: "Kurye", icon: Truck },
  { role: "COURIER_MANAGER", label: "Kurye Yöneticisi", icon: ShieldCheck },
  { role: "MARKET_OWNER", label: "Market Sahibi", icon: Store },
  { role: "ADMIN", label: "Sistem Yöneticisi (Admin)", icon: Landmark },
];

// Henüz tasarlanmamış paneller için link eklenmez; sırayla doldurulacak.
const rolePanelPaths: Partial<Record<UserRole, string>> = {
  COURIER: "/kurye/panel",
  COURIER_MANAGER: "/yonetici/panel",
  MARKET_OWNER: "/vendor/panel",
  ADMIN: "/admin/panel",
};

export default function DevRoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setRole = useAuthStore((state) => state.setRole);
  const logout = useAuthStore((state) => state.logout);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] font-sans">
      {isOpen && (
        <div className="mb-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-popover">
          <div className="flex items-center justify-between bg-charcoal px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-white">
              Dev Menu — Rol Değiştir
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-0.5 text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isAuthenticated && user && (
            <div className="border-b border-gray-100 bg-orange-50 px-3 py-2 text-xs text-charcoal">
              <div>
                Aktif: <span className="font-bold">{user.username}</span>{" "}
                <span className="text-muted">({user.role})</span>
              </div>
              {rolePanelPaths[user.role] && (
                <Link
                  href={rolePanelPaths[user.role]!}
                  onClick={() => setIsOpen(false)}
                  className="mt-1.5 flex items-center gap-1 text-xs font-bold text-primary transition hover:text-primary-600"
                >
                  Paneline Git
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          <div className="p-2">
            {roleOptions.map(({ role, label, icon: Icon }) => {
              const isActive = isAuthenticated && user?.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRole(role)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] ${
                    isActive ? "bg-orange-50 text-primary" : "text-charcoal"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted"}`} />
                  {label}
                </button>
              );
            })}
          </div>

          {isAuthenticated && (
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition hover:bg-gray-50 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Dev Menu — Rol Değiştir"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-white shadow-popover transition hover:bg-charcoal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
    </div>
  );
}
