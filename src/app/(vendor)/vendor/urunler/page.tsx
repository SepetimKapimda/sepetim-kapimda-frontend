"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import Image from "next/image";
import { ImageOff, Loader2, Pencil, Plus, Search, Tag, Trash2, X } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ProductImagePicker, {
  type ProductImagePickerHandle,
} from "@/components/vendor/ProductImagePicker";
import { formatCurrency } from "@/lib/format";
import { getTotalPages } from "@/lib/pagination";
import { isSupabaseUrl, resolveMediaUrl } from "@/lib/resolveMediaUrl";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import {
  createVendorCategory,
  createVendorProduct,
  deleteVendorCategory,
  deleteVendorProduct,
  deleteVendorProductImage,
  fetchVendorCategories,
  fetchVendorProducts,
  setVendorProductImagePrimary,
  updateVendorProduct,
  type VendorCategory,
  type VendorProduct,
  type VendorProductImage,
} from "@/lib/api/vendorProducts";

type ProductTab = "active" | "inactive";
type DiscountFilter = "all" | "discounted";

const PAGE_SIZE = 20;

const emptyForm = {
  name: "",
  description: "",
  marketPrice: "",
  discountPrice: "",
  stock: "",
  categoryId: 0,
};

// `editingProduct?.images ?? []` her render'da yeni bir dizi üretirdi — bu da
// `ProductImagePicker`'ın `memo` karşılaştırmasını her seferinde bozup
// gereksiz yeniden render'lara yol açardı. Sabit bir referans için modül
// seviyesinde tek bir boş dizi kullanılıyor.
const EMPTY_IMAGES: VendorProductImage[] = [];

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

export default function VendorUrunlerPage() {
  const [activeTab, setActiveTab] = useState<ProductTab>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const imagePickerRef = useRef<ProductImagePickerHandle>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde önceki kategori/ürün
  // listesi anında gösterilir, arka planda tazelenir.
  const { data: categories = [], mutate: mutateCategories } = useSWR(
    "vendor-categories",
    fetchVendorCategories,
    { onError: (error) => showError(error, "Kategoriler alınamadı.") }
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, categoryFilter, discountFilter, search]);

  const {
    data: productData,
    isLoading,
    mutate: mutateProducts,
  } = useSWR(
    ["vendor-products", activeTab, categoryFilter, discountFilter, debouncedSearch, currentPage],
    ([, tab, category, discounted, q, page]: [
      string,
      ProductTab,
      number | "all",
      DiscountFilter,
      string,
      number,
    ]) =>
      fetchVendorProducts({
        isActive: tab === "active",
        category: category === "all" ? undefined : category,
        discounted: discounted === "discounted" ? true : undefined,
        q: q.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    { onError: (error) => showError(error, "Ürünler alınamadı.") }
  );
  const products = productData?.results ?? [];
  const totalCount = productData?.count ?? 0;

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (product: VendorProduct) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      marketPrice: product.market_price,
      discountPrice: product.discount_price ?? "",
      stock: String(product.stock),
      categoryId: product.category,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSavingProduct) return;
    setIsModalOpen(false);
  };

  // `useCallback` ile sarılı: referansları sabit kalmazsa `ProductImagePicker`
  // (memo) her render'da yeniden render olur ve izolasyonun amacı boşa çıkar.
  const handleDeleteExistingImage = useCallback(
    async (imageId: number) => {
      try {
        await deleteVendorProductImage(imageId);
      } catch (error) {
        // 404: görsel arka planda (ör. başka bir sekmeden) zaten silinmiş —
        // amaç zaten görselin orada olmaması, bu yüzden sessizce başarı say.
        if (!(error instanceof ApiError && error.status === 404)) {
          showError(error, "Görsel silinemedi.");
          throw error;
        }
      }
      setEditingProduct((prev) =>
        prev ? { ...prev, images: prev.images.filter((img) => img.id !== imageId) } : prev
      );
      mutateProducts();
    },
    [mutateProducts]
  );

  const handleSetPrimaryExistingImage = useCallback(
    async (imageId: number) => {
      try {
        await setVendorProductImagePrimary(imageId);
        setEditingProduct((prev) =>
          prev
            ? {
                ...prev,
                images: prev.images.map((img) => ({ ...img, is_primary: img.id === imageId })),
              }
            : prev
        );
        mutateProducts();
      } catch (error) {
        showError(error, "Kapak görseli ayarlanamadı.");
      }
    },
    [mutateProducts]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.categoryId) {
      useToastStore.getState().showToast("error", "Lütfen bir kategori seçin.");
      return;
    }

    setIsSavingProduct(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        category: form.categoryId,
        market_price: form.marketPrice,
        discount_price: form.discountPrice.trim() === "" ? null : form.discountPrice,
        stock: Number(form.stock),
      };

      const files = imagePickerRef.current?.getFiles() ?? [];
      if (editingProduct) {
        await updateVendorProduct(editingProduct.id, payload, files);
      } else {
        await createVendorProduct(payload, files);
      }

      useToastStore
        .getState()
        .showToast("success", editingProduct ? "Ürün güncellendi." : "Ürün eklendi.");
      setIsModalOpen(false);
      mutateProducts();
    } catch (error) {
      showError(error, "Ürün kaydedilemedi.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const toggleActive = async (product: VendorProduct) => {
    try {
      await updateVendorProduct(product.id, { is_active: !product.is_active });
      mutateProducts();
    } catch (error) {
      showError(error, "Ürün durumu güncellenemedi.");
    }
  };

  // Stoklu bir ürün "Tükendi" olarak işaretlenir (stock: 0). Stoğu sıfır olan bir
  // ürünü geri açmak gerçek bir adet girişi gerektirdiği için düzenleme modalına yönlendirir.
  const handleToggleOutOfStock = (product: VendorProduct) => {
    if (product.stock === 0) {
      openEditModal(product);
      return;
    }
    updateVendorProduct(product.id, { stock: 0 })
      .then(() => {
        useToastStore.getState().showToast("success", `${product.name} tükendi olarak işaretlendi.`);
        mutateProducts();
      })
      .catch((error) => showError(error, "Ürün güncellenemedi."));
  };

  const handleDeleteProduct = async (product: VendorProduct) => {
    if (!window.confirm("Ürün satıştan kaldırılacak; geçmiş siparişler etkilenmez. Emin misiniz?")) {
      return;
    }
    try {
      await deleteVendorProduct(product.id);
      useToastStore.getState().showToast("success", `${product.name} satıştan kaldırıldı.`);
      mutateProducts();
    } catch (error) {
      showError(error, "Ürün silinemedi.");
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setIsSavingCategory(true);
    try {
      await createVendorCategory({ name, icon: "ShoppingBasket" });
      setNewCategoryName("");
      mutateCategories();
    } catch (error) {
      showError(error, "Kategori eklenemedi.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: VendorCategory) => {
    try {
      await deleteVendorCategory(category.id);
      if (categoryFilter === category.id) setCategoryFilter("all");
      mutateCategories();
    } catch (error) {
      showError(error, "Kategori silinemedi.");
    }
  };

  const totalPages = getTotalPages(totalCount, PAGE_SIZE);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-black text-gray-900">Ürün Yönetimi</h1>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-charcoal shadow-soft transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98]"
          >
            <Tag className="h-4 w-4 shrink-0" />
            Kategorileri Yönet
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Yeni Ürün Ekle
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1.5 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "active"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Aktif Ürünler
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("inactive")}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
            activeTab === "inactive"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
        >
          Pasif / Silinen Ürünler
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 md:w-48"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={discountFilter}
          onChange={(e) => setDiscountFilter(e.target.value as DiscountFilter)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 md:w-56"
        >
          <option value="all">Tüm Ürünler</option>
          <option value="discounted">Sadece İndirimli Ürünler</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-muted">
          Bu filtrelere uygun ürün bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {products.map((product) => {
            const coverImage = product.images.find((img) => img.is_primary) ?? product.images[0];
            return (
              <div
                key={product.id}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-popover"
              >
                <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gray-100">
                  {product.discount_percent !== null && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-soft">
                      %{product.discount_percent} İndirim
                    </span>
                  )}
                  {coverImage ? (
                    <Image
                      src={resolveMediaUrl(coverImage.image)}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                      unoptimized={isSupabaseUrl(coverImage.image)}
                      className="object-cover"
                    />
                  ) : (
                    <ImageOff className="h-8 w-8 text-gray-300" />
                  )}
                </div>

                <div className="p-3">
                  <p className="mb-1 truncate text-sm font-bold text-charcoal">{product.name}</p>
                  <p className="mb-1.5 truncate text-[11px] text-muted">{product.category_name}</p>

                  {product.discount_price !== null ? (
                    <div className="mb-1.5 flex items-baseline gap-1.5">
                      <span className="font-heading text-base font-black text-orange-600">
                        {formatCurrency(product.discount_price)}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(product.market_price)}
                      </span>
                    </div>
                  ) : (
                    <p className="mb-1.5 font-heading text-base font-black text-charcoal">
                      {formatCurrency(product.market_price)}
                    </p>
                  )}
                  <p className="mb-1.5 text-[11px] text-muted">
                    Müşteriye: <span className="font-bold">{formatCurrency(product.selling_price)}</span>
                  </p>

                  <p
                    className={`mb-2 text-xs font-bold ${
                      product.stock === 0
                        ? "text-red-600"
                        : product.stock < 10
                          ? "text-red-600"
                          : "text-green-600"
                    }`}
                  >
                    {product.stock === 0 ? "Tükendi" : `Stok: ${product.stock}`}
                  </p>

                  <div className="mb-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                    <span className="text-[11px] font-bold text-muted">Tükendi Olarak İşaretle</span>
                    <button
                      type="button"
                      onClick={() => handleToggleOutOfStock(product)}
                      role="switch"
                      aria-checked={product.stock === 0}
                      aria-label={`${product.name} tükendi olarak işaretle`}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 ${
                        product.stock === 0 ? "bg-red-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-soft transition-transform ${
                          product.stock === 0 ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(product)}
                      role="switch"
                      aria-checked={product.is_active}
                      aria-label={`${product.name} aktif/pasif`}
                      className={`relative h-6 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
                        product.is_active ? "bg-orange-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
                          product.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        aria-label={`${product.name} düzenle`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        aria-label={`${product.name} sil`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-muted transition hover:border-red-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {products.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="mt-6"
        />
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                {editingProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
              <ProductImagePicker
                ref={imagePickerRef}
                existingImages={editingProduct?.images ?? EMPTY_IMAGES}
                existingImagesOwnerName={editingProduct?.name ?? ""}
                onDeleteExisting={handleDeleteExistingImage}
                onSetPrimaryExisting={handleSetPrimaryExistingImage}
                isSubmitting={isSavingProduct}
              />

              <div>
                <label htmlFor="product-name" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Ürün Adı
                </label>
                <input
                  id="product-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Örn. Ülker Çikolatalı Gofret"
                />
              </div>

              <div>
                <label htmlFor="product-description" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Ürün Açıklaması
                </label>
                <textarea
                  id="product-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Ürün hakkında kısa bir açıklama yazın..."
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="product-price" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Market Fiyatı (₺)
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={form.marketPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, marketPrice: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="product-discount-price"
                    className="mb-1.5 block text-sm font-bold text-charcoal"
                  >
                    İndirimli Fiyat (₺)
                  </label>
                  <input
                    id="product-discount-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.discountPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, discountPrice: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Opsiyonel"
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted">
                Müşteri fiyatı, market fiyatınıza platform markup&apos;ı eklenerek otomatik hesaplanır.
              </p>

              <div>
                <label htmlFor="product-stock" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Stok Adedi
                </label>
                <input
                  id="product-stock"
                  type="number"
                  required
                  min={0}
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="product-category" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Kategori
                </label>
                <select
                  id="product-category"
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm((prev) => ({ ...prev, categoryId: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  {categories.length === 0 && <option value={0}>Kategori yok</option>}
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSavingProduct}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProduct && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-orange-500" />
                <h2 className="font-heading text-lg font-bold text-charcoal">Kategori Yönetimi</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5">
              {categories.length === 0 ? (
                <p className="mb-4 text-center text-sm text-muted">Henüz kategori eklenmedi.</p>
              ) : (
                <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
                    >
                      <span className="text-sm font-bold text-charcoal">
                        {cat.name}{" "}
                        <span className="text-xs font-medium text-muted">({cat.product_count} ürün)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        aria-label={`${cat.name} kategorisini sil`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCategory();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Yeni kategori adı"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCategory && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ekle
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

