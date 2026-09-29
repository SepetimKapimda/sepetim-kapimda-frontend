import Link from "next/link";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function DealProducts({ products }: { products: Product[] }) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="font-heading text-3xl font-black text-gray-900">
            Fırsat Ürünleri
          </h2>
          <p className="mt-1 text-base text-muted">
            Bu haftaya özel indirimli ürünleri kaçırma.
          </p>
        </div>
        <Link
          href="/arama"
          className="self-start rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] sm:shrink-0"
        >
          Tümünü Gör
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-muted">
          Şu anda gösterilecek fırsat ürünü bulunmuyor.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5 2xl:grid-cols-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
