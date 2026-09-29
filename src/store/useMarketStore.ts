import { create } from "zustand";
import { fetchMarketSettings } from "@/lib/api/vendorSettings";

interface MarketState {
  openingTime: string;
  closingTime: string;
  isTemporarilyClosed: boolean;
  setHours: (openingTime: string, closingTime: string) => void;
  /** (vendor) layout'u mount olduğunda gerçek market ayarlarını çeker. */
  fetchSettings: () => Promise<void>;
}

export const useMarketStore = create<MarketState>((set) => ({
  openingTime: "09:00",
  closingTime: "22:00",
  isTemporarilyClosed: false,
  setHours: (openingTime, closingTime) => set({ openingTime, closingTime }),
  fetchSettings: async () => {
    const settings = await fetchMarketSettings();
    set({
      openingTime: settings.opening_time.slice(0, 5),
      closingTime: settings.closing_time.slice(0, 5),
      isTemporarilyClosed: settings.is_temporarily_closed,
    });
  },
}));
