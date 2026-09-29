import type { Feature } from "./types";

// icon is a lucide-react export name today; when the Django API is wired up
// this becomes an image URL instead and the renderer swaps <Icon /> for <img />.
export const mockFeatures: Feature[] = [
  {
    id: "f1",
    icon: "Truck",
    title: "Hızlı Teslimat",
    description: "30 dakikada kapında",
  },
  {
    id: "f2",
    icon: "ShieldCheck",
    title: "Güvenli Alışveriş",
    description: "256-bit SSL koruması",
  },
  {
    id: "f3",
    icon: "Leaf",
    title: "Taze Ürün Garantisi",
    description: "Günlük taze stok",
  },
  {
    id: "f4",
    icon: "Headset",
    title: "7/24 Destek",
    description: "Her an yanındayız",
  },
];

export const mockBottomBannerFeatures: Feature[] = [
  {
    id: "b1",
    icon: "Leaf",
    title: "Taze Ürün Garantisi",
    description: "Günlük taze stok",
  },
  {
    id: "b2",
    icon: "ShoppingBasket",
    title: "Geniş Ürün Yelpazesi",
    description: "Onlarca ürün, tek market",
  },
  {
    id: "b3",
    icon: "BadgePercent",
    title: "Avantajlı Fiyatlar",
    description: "Her zaman en iyisi",
  },
];

