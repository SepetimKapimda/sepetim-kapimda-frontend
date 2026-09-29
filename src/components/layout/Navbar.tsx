"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  LogOut,
  Plus,
  Search,
  ShoppingCart,
  User,
  MapPin,
  Menu,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useAddressStore } from "@/store/useAddressStore";
import Logo from "@/components/Logo";
import { fetchProducts } from "@/lib/api/products";
import { fetchCategories, type CategoryListItem } from "@/lib/api/categories";
import { formatCurrency } from "@/lib/format";
import { isSupabaseUrl } from "@/lib/resolveMediaUrl";
import type { Address } from "@/lib/api/addresses";
import type { Product } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 300;

const ADDRESS_TYPE_LABELS: Record<Address["address_type"], string> = {
  home: "Ev",
  work: "İş",
  billing: "Diğer",
};

export default function Navbar() {
  const router = useRouter();
  const cartItemCount = useCartStore((state) => state.items.length);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const toggleMobileMenu = useUIStore((state) => state.toggleMobileMenu);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authUser = useAuthStore((state) => state.user);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const logout = useAuthStore((state) => state.logout);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);

  const addresses = useAddressStore((state) => state.addresses);
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);
  const hasFetchedAddresses = useAddressStore((state) => state.hasFetched);
  const selectAddress = useAddressStore((state) => state.selectAddress);
  const hydrateAddressSelection = useAddressStore((state) => state.hydrate);
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0] ?? null;

  const [allCategories, setAllCategories] = useState<CategoryListItem[]>([]);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  useEffect(() => {
    hydrateAddressSelection();
  }, [hydrateAddressSelection]);

  useEffect(() => {
    fetchCategories()
      .then(setAllCategories)
      .catch(() => {
        // Kategori önerileri ikincil bir özellik — sessizce boş listeyle devam eder.
      });
  }, []);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSearchOpen(false);
    router.push(`/arama?q=${encodeURIComponent(searchQuery)}`);
  };

  const searchNeedle = searchQuery.trim().toLocaleLowerCase("tr");

  useEffect(() => {
    if (searchNeedle.length < 2) {
      setMatchedProducts([]);
      return;
    }
    setIsSearchingProducts(true);
    const timeoutId = window.setTimeout(() => {
      fetchProducts({ q: searchNeedle, pageSize: 5 })
        .then((data) => setMatchedProducts(data.products))
        .catch(() => setMatchedProducts([]))
        .finally(() => setIsSearchingProducts(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchNeedle]);

  const matchedCategories = searchNeedle
    ? allCategories.filter((category) =>
        category.name.toLocaleLowerCase("tr").includes(searchNeedle)
      )
    : [];
  const hasSuggestionResults =
    matchedCategories.length > 0 || matchedProducts.length > 0;
  const showSuggestions = isSearchOpen && searchQuery.length > 1;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white shadow-soft">
      <div className="flex w-full max-w-[1536px] mx-auto flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 lg:px-8">
        {/* Hamburger (mobile only) */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label="Kategori menüsünü aç"
          className="order-1 -ml-1 flex items-center justify-center rounded-lg p-2 text-charcoal transition hover:bg-offwhite hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.95] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo — yüksekliği header'ı taşırmayacak şekilde sabit, genişlik orana göre otomatik */}
        <Link href="/" className="order-2 flex shrink-0 items-center">
          <Logo className="h-16 w-auto object-contain md:h-20" />
        </Link>

        {/* Search Bar - wraps to its own row below md */}
        <div className="order-5 w-full md:order-4 md:w-auto md:flex-1">
          <div className="relative w-full max-w-2xl">
            <form
              onSubmit={handleSearch}
              className="flex w-full items-center overflow-hidden rounded-full border border-gray-300 bg-white transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
            >
              <span className="flex shrink-0 items-center pl-4 pr-2">
                <Search className="h-5 w-5 text-[#FF5000]" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => setIsSearchOpen(false)}
                placeholder="Binlerce ürün arasından aradığını hemen bul..."
                className="min-w-0 flex-grow bg-transparent px-2 py-2 text-xs text-gray-700 outline-none placeholder:text-muted md:py-3 md:text-sm"
              />
              <button
                type="submit"
                aria-label="Ara"
                className="flex shrink-0 items-center justify-center bg-[#FF5000] px-3 py-2 text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:scale-95 md:px-6 md:py-3"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>

            {/* Canlı arama önerileri */}
            {showSuggestions && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                {isSearchingProducts && !hasSuggestionResults ? (
                  <p className="px-4 py-4 text-sm text-muted">Aranıyor...</p>
                ) : hasSuggestionResults ? (
                  <div className="max-h-80 overflow-y-auto py-2">
                    {matchedCategories.length > 0 && (
                      <div>
                        <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                          Kategoriler
                        </p>
                        {matchedCategories.map((category) => (
                          <Link
                            key={category.slug}
                            href={`/kategoriler/${category.slug}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal transition hover:bg-orange-50"
                          >
                            <Search className="h-4 w-4 shrink-0 text-primary" />
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    )}

                    {matchedProducts.length > 0 && (
                      <div>
                        <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                          Ürünler
                        </p>
                        {matchedProducts.map((product) => (
                          <Link
                            key={product.slug}
                            href={`/urun/${product.slug}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal transition hover:bg-orange-50"
                          >
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={40}
                              height={40}
                              unoptimized={isSupabaseUrl(product.image)}
                              className="h-10 w-10 shrink-0 rounded-md border border-gray-100 object-cover"
                            />
                            <span className="flex-1 truncate">{product.name}</span>
                            <span className="shrink-0 text-sm font-bold text-[#FF5000]">
                              {formatCurrency(product.price)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="px-4 py-4 text-sm text-muted">
                    &quot;{searchQuery}&quot; için sonuç bulunamadı
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Address — sadece giriş yapmış kullanıcılara gösterilir,
            çünkü sepet minimum tutarı seçili adrese göre değişiyor. İlk çekim
            tamamlanana kadar (hasFetchedAddresses) yanlış bir durum
            yanıp sönmesin diye hiçbir şey render edilmez. */}
        {isAuthenticated && hasFetchedAddresses && (
          <div className="relative order-6 hidden lg:block">
            {selectedAddress ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsAddressDropdownOpen((prev) => !prev)}
                  aria-expanded={isAddressDropdownOpen}
                  aria-label={`Teslimat adresini değiştir: ${ADDRESS_TYPE_LABELS[selectedAddress.address_type]}, ${selectedAddress.neighborhood_display}, ${selectedAddress.district_display}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-muted transition hover:bg-offwhite hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="leading-tight">
                    <span className="block text-sm text-muted">
                      Teslimat adresi
                    </span>
                    <span className="block max-w-[220px] truncate text-base font-bold text-gray-900">
                      {ADDRESS_TYPE_LABELS[selectedAddress.address_type]}, {selectedAddress.neighborhood_display}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                      isAddressDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isAddressDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAddressDropdownOpen(false)} />
                    <div
                      data-testid="address-dropdown-panel"
                      className="absolute top-full z-50 mt-2 w-72 rounded-xl border border-gray-100 bg-white p-2 shadow-lg"
                    >
                      {addresses.map((address) => {
                        const isSelected = address.id === selectedAddress.id;
                        return (
                          <button
                            key={address.id}
                            type="button"
                            onClick={() => {
                              selectAddress(address.id);
                              setIsAddressDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-orange-50"
                          >
                            <span className="flex flex-col">
                              <span className="font-bold text-charcoal">
                                {ADDRESS_TYPE_LABELS[address.address_type]}
                              </span>
                              <span className="text-xs text-muted">
                                {address.neighborhood_display}, {address.district_display}
                              </span>
                            </span>
                            {isSelected && (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </button>
                        );
                      })}
                      <Link
                        href="/hesabim?tab=addresses"
                        onClick={() => setIsAddressDropdownOpen(false)}
                        className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-gray-100 px-3 py-2.5 pt-3 text-left text-sm font-bold text-primary transition hover:bg-orange-50"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        Yeni Adres Ekle
                      </Link>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link
                href="/hesabim?tab=addresses"
                aria-label="Teslimat adresi ekle"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-primary transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                <MapPin className="h-4 w-4" />
                Yeni Adres Ekle
              </Link>
            )}
          </div>
        )}

        {/* Right actions */}
        <div className="order-4 ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:order-7 md:ml-0">
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-expanded={isProfileMenuOpen}
                aria-label={`Hesap menüsü: ${authUser?.username ?? "Hesabım"}`}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-base font-semibold text-charcoal transition hover:bg-offwhite hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:block">
                  {authUser?.username ?? "Hesabım"}
                </span>
                <ChevronDown
                  className={`hidden h-4 w-4 transition-transform sm:block ${
                    isProfileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                  <Link
                    href="/hesabim"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-charcoal transition hover:bg-orange-50"
                  >
                    <User className="h-4 w-4 text-muted" />
                    Hesabım
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsProfileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              aria-label="Giriş Yap / Üye Ol"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-base font-semibold text-charcoal transition hover:bg-offwhite hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
            >
              <User className="h-5 w-5" />
              <span className="hidden sm:block">Giriş Yap / Üye Ol</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleCart}
            aria-label="Sepeti aç"
            className="relative flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-base font-semibold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:block">Sepetim</span>
            {cartItemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-charcoal shadow-soft">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
