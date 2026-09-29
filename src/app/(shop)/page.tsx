import HeroBanner from "@/components/home/HeroBanner";
import FeatureBar from "@/components/home/FeatureBar";
import DealProducts from "@/components/home/DealProducts";
import { fetchHomeProducts } from "@/lib/api/products";
import { fetchStorefront, type StorefrontInfo } from "@/lib/api/storefront";
import { fetchActiveBanners } from "@/lib/api/banners";
import type { ActiveBanner } from "@/lib/api/banners";
import type { Product } from "@/lib/types";

export default async function Home() {
  let products: Product[] = [];
  let storefront: StorefrontInfo | null = null;
  let banners: ActiveBanner[] = [];

  try {
    [products, storefront, banners] = await Promise.all([
      fetchHomeProducts(),
      fetchStorefront(),
      fetchActiveBanners(),
    ]);
  } catch (error) {
    console.error("Anasayfa verisi (ürünler/vitrin/afiş) alınamadı:", error);
  }

  return (
    <div className="w-full space-y-8 px-4 py-6 pb-24 sm:space-y-10 sm:py-8 sm:pb-24 lg:px-8 lg:py-10 lg:pb-28">
      <HeroBanner storefront={storefront} banners={banners} />
      <FeatureBar />
      <DealProducts products={products} />
    </div>
  );
}
