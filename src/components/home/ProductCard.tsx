"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { isSupabaseUrl } from "@/lib/resolveMediaUrl";
import type { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    // API şemasına göre sepete ürün eklemek giriş yapmayı gerektiriyor.
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    setIsAdding(true);
    try {
      await addItem(Number(product.id), 1);
    } catch (error) {
      useToastStore
        .getState()
        .showToast(
          "error",
          error instanceof ApiError ? error.message : "Ürün sepete eklenemedi."
        );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
      {/* Image area — links through to the product detail page */}
      <Link
        href={`/urun/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden bg-offwhite"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          unoptimized={isSupabaseUrl(product.image)}
          className="object-cover mix-blend-multiply"
        />

        {product.discountPercent && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-charcoal shadow-soft">
            %{product.discountPercent} İndirim
          </span>
        )}
      </Link>

      {/* Content area — grows to push the button to a shared baseline */}
      <div className="flex flex-grow flex-col gap-1 p-3">
        <Link href={`/urun/${product.slug}`}>
          <h3 className="line-clamp-1 text-sm font-semibold text-charcoal transition-colors hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <p className="line-clamp-1 text-xs text-muted">
          {product.description ? `${product.description} • ` : ""}
          {product.unit}
        </p>

        <div className="mt-2 flex flex-col">
          {product.oldPrice && (
            <span className="text-xs text-muted line-through">
              {formatCurrency(product.oldPrice)}
            </span>
          )}
          <span className="whitespace-nowrap text-lg font-extrabold text-primary sm:text-xl md:text-2xl lg:text-3xl">
            {formatCurrency(product.price)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding}
          className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:py-2.5 sm:text-sm"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
          Hemen Ekle
        </button>
      </div>
    </div>
  );
}
