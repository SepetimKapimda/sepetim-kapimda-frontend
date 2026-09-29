"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  PackageSearch,
  Plus,
  ShoppingCart,
  Star,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { ApiError } from "@/lib/apiClient";
import { fetchProductBySlug, type ProductDetail } from "@/lib/api/products";
import { fetchCategoryById, type CategoryDetail } from "@/lib/api/categories";
import { formatCurrency } from "@/lib/format";
import { isSupabaseUrl } from "@/lib/resolveMediaUrl";

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);

  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);
    setActiveImageIndex(0);
    fetchProductBySlug(slug)
      .then((data) => {
        setProduct(data);
        // Kategori adı sadece breadcrumb süslemesi — alınamazsa sayfa yine çalışır.
        fetchCategoryById(data.category)
          .then(setCategory)
          .catch(() => setCategory(null));
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        } else {
          useToastStore
            .getState()
            .showToast("error", error instanceof ApiError ? error.message : "Ürün bilgisi alınamadı.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  const cartItem = product ? items.find((item) => item.productId === product.id) : undefined;

  const handleQuantityChange = (cartItemId: number, quantity: number) => {
    updateQuantity(cartItemId, quantity).catch((error) => {
      useToastStore
        .getState()
        .showToast("error", error instanceof ApiError ? error.message : "Adet güncellenemedi.");
    });
  };

  const nextImage = () => {
    if (!product) return;
    setActiveImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    if (!product) return;
    setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    try {
      await addItem(product.id, 1);
    } catch (error) {
      useToastStore
        .getState()
        .showToast("error", error instanceof ApiError ? error.message : "Ürün sepete eklenemedi.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <PackageSearch className="h-10 w-10 text-muted" />
        <h1 className="font-heading text-xl font-bold text-charcoal">Ürün bulunamadı</h1>
        <p className="text-sm text-muted">Aradığınız ürün kaldırılmış veya stoktan çıkarılmış olabilir.</p>
        <Link href="/" className="mt-2 text-sm font-bold text-primary hover:underline">
          Anasayfaya dön
        </Link>
      </div>
    );
  }

  const reviewCount = product.comments.length;
  const averageRating =
    reviewCount > 0
      ? product.comments.reduce((sum, c) => sum + c.rating, 0) / reviewCount
      : 0;
  const images = product.images.length > 0
    ? product.images
    : [{ id: 0, image: "https://placehold.co/600x600.png", alt_text: product.name }];

  return (
    <div className="w-full px-4 py-6 pb-28 lg:px-8 lg:py-10 lg:pb-10">
      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted"
      >
        <Link href="/" className="transition hover:text-primary">
          Anasayfa
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link href={`/kategoriler/${category.slug}`} className="transition hover:text-primary">
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold text-charcoal">{product.name}</span>
      </nav>

      {/* Ana içerik */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Sol kolon — Görsel galerisi */}
        <div>
          <div className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-offwhite">
            <Image
              src={images[activeImageIndex].image}
              alt={images[activeImageIndex].alt_text ?? product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized={isSupabaseUrl(images[activeImageIndex].image)}
              className="object-cover mix-blend-multiply"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Önceki görsel"
                  className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 opacity-100 shadow-md transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90 md:opacity-0 md:group-hover:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Sonraki görsel"
                  className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 opacity-100 shadow-md transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90 md:opacity-0 md:group-hover:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="hide-scrollbar mt-4 flex gap-3 overflow-x-auto">
              {images.map((img, index) => {
                const isActive = index === activeImageIndex;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`${product.name} görsel ${index + 1}`}
                    aria-pressed={isActive}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-offwhite transition ${
                      isActive
                        ? "border-[#FF5000]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Image
                      src={img.image}
                      alt={img.alt_text ?? `${product.name} küçük görsel`}
                      fill
                      sizes="80px"
                      unoptimized={isSupabaseUrl(img.image)}
                      className="object-cover mix-blend-multiply"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sağ kolon — Ürün bilgisi ve sepet aksiyonu */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-charcoal sm:text-3xl">
              {product.name}
            </h1>
            {reviewCount > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 text-sm font-bold text-charcoal">
                  <Star className="h-4 w-4 fill-secondary text-secondary" />
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-muted">({reviewCount} değerlendirme)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-[#FF5000]">{formatCurrency(product.selling_price)}</p>
            {product.original_price && (
              <p className="text-lg font-medium text-muted line-through">
                {formatCurrency(product.original_price)}
              </p>
            )}
          </div>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              product.in_stock
                ? "bg-green-50 text-green-600"
                : "bg-gray-100 text-muted"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                product.in_stock ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            {product.in_stock ? "Stokta" : "Stokta Yok"}
          </span>

          {/* Sepete ekle / miktar — mobilde ekranın altına sabitlenir */}
          <div className="fixed bottom-0 left-0 z-40 w-full border-t border-gray-100 bg-white p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.06)] md:static md:z-auto md:mt-2 md:w-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            {!product.in_stock ? (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-gray-200 py-3.5 text-base font-bold text-muted md:w-auto md:px-10"
              >
                Stokta Yok
              </button>
            ) : cartItem ? (
              <div className="flex items-center justify-center overflow-hidden rounded-full bg-primary shadow-soft md:w-fit">
                <button
                  type="button"
                  onClick={() =>
                    handleQuantityChange(cartItem.cartItemId, cartItem.quantity - 1)
                  }
                  aria-label={`${product.name} adedini azalt`}
                  className="flex h-12 flex-1 items-center justify-center px-6 text-white transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-90 md:flex-none"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-base font-bold text-white">
                  {cartItem.quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleQuantityChange(cartItem.cartItemId, cartItem.quantity + 1)
                  }
                  aria-label={`${product.name} adedini artır`}
                  className="flex h-12 flex-1 items-center justify-center px-6 text-white transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-90 md:flex-none"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5000] py-3.5 text-base font-bold text-white shadow-card transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] md:w-auto md:px-10"
              >
                <ShoppingCart className="h-5 w-5" />
                Sepete Ekle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Açıklama ve Yorumlar */}
      <div className="mt-10 flex flex-col gap-6 md:mt-14">
        {product.description && (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
            <h2 className="font-heading text-lg font-bold text-charcoal">
              Ürün Açıklaması
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {product.description}
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="font-heading text-lg font-bold text-charcoal">
            Değerlendirmeler ({reviewCount})
          </h2>

          {reviewCount === 0 ? (
            <p className="mt-3 text-sm text-muted">Bu ürün için henüz bir değerlendirme yapılmamış.</p>
          ) : (
            <div className="mt-4 flex flex-col divide-y divide-gray-100">
              {product.comments.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-charcoal">
                      {comment.user_display_name}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(comment.created).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          index < comment.rating
                            ? "fill-secondary text-secondary"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  {comment.comment && <p className="text-sm text-gray-600">{comment.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
