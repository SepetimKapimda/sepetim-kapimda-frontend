import { create } from "zustand";

export type ToastType = "success" | "error";

interface ToastState {
  toast: { type: ToastType; message: string } | null;
  showToast: (type: ToastType, message: string) => void;
  hideToast: () => void;
}

let dismissTimer: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (type, message) => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ toast: { type, message } });
    dismissTimer = setTimeout(() => set({ toast: null }), 3500);
  },
  hideToast: () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ toast: null });
  },
}));
