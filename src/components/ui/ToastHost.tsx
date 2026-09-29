"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";

// Uygulama genelinde tek örnek — herhangi bir bileşen
// `useToastStore.getState().showToast(type, message)` çağırarak buradan mesaj gösterebilir.
export default function ToastHost() {
  const toast = useToastStore((state) => state.toast);

  if (!toast) return null;

  return (
    <div
      role="status"
      className={`fixed left-1/2 top-4 z-[200] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-bold shadow-popover ${
        toast.type === "success"
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <div className="flex items-center gap-2">
        {toast.type === "success" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0" />
        )}
        {toast.message}
      </div>
    </div>
  );
}
