"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ChevronRight, Loader2, PackageSearch } from "lucide-react";
import ProductCard from "@/components/home/ProductCard";
import Pagination from "@/components/ui/Pagination";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import { fetchProducts, type ProductOrdering } from "@/lib/api/products";
import { fetchCategoryBySlug } from "@/lib/api/categories";

const PAGE_SIZE = 20;

type SortOption = "" | ProductOrdering;

export default function CategoryListingPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [sortBy, setSortBy] = useState<SortOption>("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // SWR cache'i sayesinde bu kategoriye geri dönüldüğünde (ör. Sidebar'dan)
  // başlık ve ürün listesi anında gösterilir, arka planda tazelenir.
  const { data: categoryData, error: categoryError } = useSWR(
    ["category-by-slug", slug],
    ([, slugValue]: [string, string]) => fetchCategoryBySlug(slugValue),
    // Var olmayan bir slug (404) beklenen bir durumdur (kullanıcı elle URL
    // yazmış olabilir) — SWR'ın varsayılan sonsuz yeniden deneme mekanizması
    // olmayan bir kaynağı sonsuza kadar tekrar tekrar sorgulamasın.
    { shouldRetryOnError: false }
  );
  const categoryName = categoryData?.name ?? null;
  const notFound = categoryError instanceof ApiError && categoryError.status === 404;

  useEffect(() => {
    setCurrentPage(1);
  }, [slug, sortBy, appliedMinPrice, appliedMaxPrice]);

  const { data: productData, isLoading } = useSWR(
    ["category-products", slug, sortBy, appliedMinPrice, appliedMaxPrice, currentPage],
    ([, slugValue, sort, priceGte, priceLte, page]: [
      string,
      string,
      SortOption,
      number | null,
      number | null,
      number,
    ]) =>
      fetchProducts({
        category: slugValue,
        ordering: sort || undefined,
        priceGte: priceGte ?? undefined,
        priceLte: priceLte ?? undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    {
      onError: (error) => {
        useToastStore
          .getState()
          .showToast("error", error instanceof ApiError ? error.message : "Ürünler alınamadı.");
      },
    }
  );
  const products = productData?.products ?? [];
  const count = productData?.count ?? 0;

  const handleApplyPriceFilter = () => {
    setAppliedMinPrice(minPriceInput === "" ? null : Number(minPriceInput));
    setAppliedMaxPrice(maxPriceInput === "" ? null : Number(maxPriceInput));
  };

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <PackageSearch className="h-10 w-10 text-muted" />
        <h1 className="font-heading text-xl font-bold text-charcoal">Kategori bulunamadı</h1>
        <Link href="/" className="mt-2 text-sm font-bold text-primary hover:underline">
          Anasayfaya dön
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 lg:px-8 lg:py-10">
      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-sm text-muted"
      >
        <Link href="/" className="transition hover:text-primary">
          Anasayfa
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold text-charcoal">{categoryName ?? "…"}</span>
      </nav>

      {/* Kategori başlığı */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-black text-gray-900 sm:text-3xl">
          {categoryName ? `${categoryName} Ürünleri` : "Ürünler"}
        </h1>
        <p className="mt-1 text-sm text-muted">{count} ürün bulundu</p>
      </div>

      {/* Filtreleme Çubuğu (yatay toolbar) */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex w-full flex-col gap-1.5 sm:w-48">
          <label className="text-xs font-semibold text-muted">
            Sıralama
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Önerilen</option>
            <option value="price">En Düşük Fiyat</option>
            <option value="-price">En Yüksek Fiyat</option>
            <option value="name">A-Z</option>
          </select>
        </div>

        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          <label className="text-xs font-semibold text-muted">
            Fiyat Aralığı
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Min"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 sm:w-28"
            />
            <span className="shrink-0 text-muted">-</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Max"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 sm:w-28"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleApplyPriceFilter}
          className="w-full shrink-0 rounded-xl bg-[#FF5000] px-6 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] sm:ml-auto sm:w-auto"
        >
          Uygula
        </button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-soft">
          <PackageSearch className="h-10 w-10 text-muted" />
          <p className="text-sm font-semibold text-charcoal">
            Bu filtrelere uygun ürün bulunamadı
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-6 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {products.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={getTotalPages(count, PAGE_SIZE)}
          onPageChange={setCurrentPage}
          className="mt-8"
        />
      )}
    </div>
  );
}
