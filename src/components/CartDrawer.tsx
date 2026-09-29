"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useToastStore } from "@/store/useToastStore";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { isSupabaseUrl } from "@/lib/resolveMediaUrl";

export default function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartTotal = useCartStore((state) => state.cartTotal);

  const handleUpdateQuantity = (cartItemId: number, quantity: number) => {
    updateQuantity(cartItemId, quantity).catch((error) => {
      useToastStore
        .getState()
        .showToast("error", error instanceof ApiError ? error.message : "Adet güncellenemedi.");
    });
  };

  const handleRemoveItem = (cartItemId: number) => {
    removeItem(cartItemId).catch((error) => {
      useToastStore
        .getState()
        .showToast("error", error instanceof ApiError ? error.message : "Ürün sepetten çıkarılamadı.");
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={`fixed inset-0 z-[100] bg-charcoal/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sepetim"
        className={`fixed right-0 top-0 z-[110] flex h-full w-full flex-col bg-white shadow-popover transition-transform duration-300 ease-in-out md:w-[400px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-heading text-xl font-bold text-charcoal">
            Sepetim
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Sepeti kapat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-offwhite hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-offwhite">
              <ShoppingCart className="h-9 w-9 text-muted" />
            </div>
            <p className="text-lg font-bold text-charcoal">
              Sepetiniz şu an boş
            </p>
            <p className="text-sm text-muted">
              Fırsat ürünlerine göz atıp sepetini doldurmaya başla.
            </p>
            <button
              type="button"
              onClick={closeCart}
              className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.97]"
            >
              Alışverişe Başla
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li
                  key={item.cartItemId}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-soft"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-offwhite">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      unoptimized={isSupabaseUrl(item.image)}
                      className="object-cover mix-blend-multiply"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="line-clamp-1 text-sm font-semibold text-charcoal">
                      {item.name}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.cartItemId)}
                      aria-label={`${item.name} ürününü sepetten çıkar`}
                      className="rounded text-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-center overflow-hidden rounded-full bg-primary shadow-soft">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity - 1)}
                        aria-label={`${item.name} adedini azalt`}
                        className="flex h-8 w-8 items-center justify-center text-white transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-90"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity + 1)}
                        aria-label={`${item.name} adedini artır`}
                        className="flex h-8 w-8 items-center justify-center text-white transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Checkout footer */}
        {items.length > 0 && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.06)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted">Toplam Tutar</span>
              <span className="text-xl font-extrabold text-charcoal">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-charcoal py-3.5 text-base font-bold text-white shadow-card transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/50 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              Sepeti Onayla
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
