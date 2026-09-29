"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, PackageSearch } from "lucide-react";
import ProductCard from "@/components/home/ProductCard";
import Pagination from "@/components/ui/Pagination";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import { fetchProducts, type ProductOrdering } from "@/lib/api/products";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 20;

type SortOption = "" | ProductOrdering;

export default function SearchResultsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [sortBy, setSortBy] = useState<SortOption>("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleApplyPriceFilter = () => {
    setAppliedMinPrice(minPriceInput === "" ? null : Number(minPriceInput));
    setAppliedMaxPrice(maxPriceInput === "" ? null : Number(maxPriceInput));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [q, sortBy, appliedMinPrice, appliedMaxPrice]);

  useEffect(() => {
    setIsLoading(true);
    fetchProducts({
      q: q || undefined,
      ordering: sortBy || undefined,
      priceGte: appliedMinPrice ?? undefined,
      priceLte: appliedMaxPrice ?? undefined,
      page: currentPage,
      pageSize: PAGE_SIZE,
    })
      .then((data) => {
        setProducts(data.products);
        setCount(data.count);
      })
      .catch((error) => {
        useToastStore
          .getState()
          .showToast("error", error instanceof ApiError ? error.message : "Ürünler alınamadı.");
      })
      .finally(() => setIsLoading(false));
  }, [q, sortBy, appliedMinPrice, appliedMaxPrice, currentPage]);

  const pageTitle = q ? `"${q}" için arama sonuçları` : "Tüm Ürünler";

  return (
    <div className="w-full px-4 py-6 lg:px-8 lg:py-10">
      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted"
      >
        <Link href="/" className="transition hover:text-primary">
          Anasayfa
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className={q ? "" : "font-semibold text-charcoal"}>Arama</span>
        {q && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold text-charcoal">{q}</span>
          </>
        )}
      </nav>

      {/* Sayfa başlığı */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-black text-gray-900 sm:text-3xl">
          {pageTitle}
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
