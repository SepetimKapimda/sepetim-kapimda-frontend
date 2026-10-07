import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Oturum/ödeme/panel gerektiren veya kişiye özel (PII) sayfalar —
      // indekslenmelerinin SEO değeri yok, üstelik sipariş/müşteri bilgisi
      // içerebilirler.
      disallow: [
        "/checkout",
        "/hesabim",
        "/siparis-takip",
        "/siparis-basarili",
        "/vendor",
        "/admin",
        "/kurye",
        "/yonetici",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
