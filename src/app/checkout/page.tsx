"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Briefcase,
  Check,
  CheckCircle2,
  CreditCard,
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  ShoppingBag,
  Tag,
  X,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useToastStore } from "@/store/useToastStore";
import { useAddressStore } from "@/store/useAddressStore";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { isSupabaseUrl } from "@/lib/resolveMediaUrl";
import {
  createAddress,
  fetchAddressLocations,
  type Address,
  type AddressLocations,
} from "@/lib/api/addresses";
import { validateCoupon } from "@/lib/api/coupons";
import {
  createOrder,
  fetchOrderLegalDocs,
  previewOrder,
  type LegalDocsResponse,
  type OrderPreviewResponse,
  type PaymentMethod,
} from "@/lib/api/orders";

type CheckoutLegalDoc = "on-bilgilendirme-formu" | "mesafeli-satis-sozlesmesi";

const legalDocMeta: Record<
  CheckoutLegalDoc,
  { title: string; field: keyof LegalDocsResponse }
> = {
  "on-bilgilendirme-formu": {
    title: "Ön Bilgilendirme Formu",
    field: "on_bilgilendirme_formu_html",
  },
  "mesafeli-satis-sozlesmesi": {
    title: "Mesafeli Satış Sözleşmesi",
    field: "mesafeli_satis_sozlesmesi_html",
  },
};

const addressTypeMeta: Record<Address["address_type"], { label: string; icon: typeof Home }> = {
  home: { label: "Ev", icon: Home },
  work: { label: "İş", icon: Briefcase },
  billing: { label: "Diğer", icon: MapPin },
};

const emptyAddressForm = {
  address_type: "home" as Address["address_type"],
  full_name: "",
  phone: "",
  district: "",
  neighborhood: "",
  street: "",
  latitude: null as number | null,
  longitude: null as number | null,
};

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.cartTotal);
  const isCartLoading = useCartStore((state) => state.isLoading);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const resetCart = useCartStore((state) => state.resetCart);

  // Header'daki "Teslimat adresi" dropdown'u ile aynı seçim (useAddressStore) —
  // kullanıcı orada bir adres seçtiyse Checkout otomatik olarak onunla açılır.
  const addresses = useAddressStore((state) => state.addresses);
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);
  const isLoadingAddresses = useAddressStore((state) => state.isLoading);
  const selectAddress = useAddressStore((state) => state.selectAddress);
  const addAddressToStore = useAddressStore((state) => state.addAddress);
  const fetchAddressesIntoStore = useAddressStore((state) => state.fetchAddresses);
  const hydrateAddressSelection = useAddressStore((state) => state.hydrate);
  const [addressLocations, setAddressLocations] = useState<AddressLocations | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [courierNote, setCourierNote] = useState("");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState(emptyAddressForm);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<CheckoutLegalDoc | null>(null);
  const [legalDocs, setLegalDocs] = useState<LegalDocsResponse | null>(null);
  const [isLoadingLegalDocs, setIsLoadingLegalDocs] = useState(false);
  const closeLegalDoc = () => setActiveLegalDoc(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountValue: number } | null>(
    null
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [preview, setPreview] = useState<OrderPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Sepeti backend'den yeniden çek (checkout'a doğrudan/eski sekmeden gelinmiş olabilir).
  useEffect(() => {
    fetchCart().catch((error) => showError(error, "Sepet bilgisi alınamadı."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kayıtlı adresler (Header ile paylaşılan useAddressStore üzerinden) + ilçe/mahalle seçenekleri.
  useEffect(() => {
    let isMounted = true;
    // Checkout'a doğrudan `/checkout` linkiyle (Header'ı barındıran layout
    // dışından) gelinmiş olabilir — Header'da az önce seçilen adresin
    // localStorage'daki kaydı önce buraya da geri yüklenmeli, aksi halde
    // `fetchAddressesIntoStore` seçili adresi bilmeden en son eklenen
    // adrese düşer.
    hydrateAddressSelection();
    fetchAddressesIntoStore();
    fetchAddressLocations()
      .then((locations) => {
        if (isMounted) setAddressLocations(locations);
      })
      .catch((error) => {
        if (isMounted) showError(error, "Adresler yüklenemedi.");
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adres, kupon veya sepet toplamı değiştikçe sipariş önizlemesini (teslimat ücreti,
  // min. sepet tutarı, market kapalı vb. iş kuralları) tazele.
  useEffect(() => {
    if (!selectedAddressId || items.length === 0) {
      setPreview(null);
      return;
    }
    let isCancelled = false;
    setIsPreviewLoading(true);
    previewOrder({ deliveryAddressId: selectedAddressId, couponCode: appliedCoupon?.code })
      .then((data) => {
        if (!isCancelled) setPreview(data);
      })
      .catch((error) => {
        if (!isCancelled) {
          setPreview(null);
          showError(error, "Sipariş önizlemesi alınamadı.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsPreviewLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedAddressId, appliedCoupon, items.length, cartTotal]);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const data = await validateCoupon(code);
      setAppliedCoupon({ code: data.code, discountValue: Number(data.discount_value) });
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error instanceof ApiError ? error.message : "Kupon doğrulanamadı.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const openLegalDoc = async (doc: CheckoutLegalDoc) => {
    setActiveLegalDoc(doc);
    if (!selectedAddressId) return;

    setIsLoadingLegalDocs(true);
    try {
      const data = await fetchOrderLegalDocs({
        deliveryAddressId: selectedAddressId,
        billingAddressId: selectedAddressId,
        couponCode: appliedCoupon?.code,
        paymentMethod,
      });
      setLegalDocs(data);
    } catch (error) {
      showError(error, "Sözleşme metni alınamadı.");
    } finally {
      setIsLoadingLegalDocs(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      useToastStore.getState().showToast("error", "Tarayıcınız konum paylaşımını desteklemiyor.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewAddressForm((form) => ({
          ...form,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setIsLocating(false);
      },
      () => {
        useToastStore
          .getState()
          .showToast("error", "Konumunuza erişilemedi. Lütfen tarayıcı izinlerini kontrol edin.");
        setIsLocating(false);
      }
    );
  };

  const handleSaveNewAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newAddressForm.district || !newAddressForm.neighborhood) {
      useToastStore.getState().showToast("error", "Lütfen ilçe ve mahalle seçin.");
      return;
    }
    if (newAddressForm.latitude === null || newAddressForm.longitude === null) {
      useToastStore
        .getState()
        .showToast("error", "Teslimat mesafesi hesaplanabilmesi için önce konumunuzu paylaşın.");
      return;
    }

    setIsSavingAddress(true);
    try {
      const created = await createAddress({
        full_name: newAddressForm.full_name,
        phone: newAddressForm.phone,
        street: newAddressForm.street,
        district: newAddressForm.district,
        neighborhood: newAddressForm.neighborhood,
        address_type: newAddressForm.address_type,
        latitude: newAddressForm.latitude,
        longitude: newAddressForm.longitude,
      });
      addAddressToStore(created);
      setIsAddressModalOpen(false);
      setNewAddressForm(emptyAddressForm);
      useToastStore.getState().showToast("success", "Adres eklendi.");
    } catch (error) {
      showError(error, "Adres eklenemedi.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (isSubmitting || !hasAcceptedTerms || !selectedAddressId) return;
    if (preview && !preview.is_valid) {
      useToastStore.getState().showToast("error", preview.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await createOrder({
        deliveryAddressId: selectedAddressId,
        billingAddressId: selectedAddressId,
        couponCode: appliedCoupon?.code,
        paymentMethod,
        courierNote,
      });
      resetCart();
      router.push(`/siparis-basarili?orderId=${data.order_id}`);
    } catch (error) {
      showError(error, "Sipariş oluşturulamadı.");
      setIsSubmitting(false);
    }
  };

  if (isCartLoading && items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-offwhite">
          <ShoppingBag className="h-9 w-9 text-muted" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-charcoal">
          Sepetiniz boş
        </h1>
        <p className="max-w-sm text-sm text-muted">
          Ödeme adımına geçebilmen için sepetinde en az bir ürün olmalı.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          Alışverişe Başla
        </Link>
      </div>
    );
  }

  const cartSubtotal = preview ? Number(preview.cart_total) : cartTotal;
  const deliveryFee = preview ? Number(preview.courier_fee) : 0;
  const distanceKm = preview ? Number(preview.distance_km) : null;
  const couponDiscount = appliedCoupon?.discountValue ?? 0;
  const grandTotal = cartSubtotal + deliveryFee - couponDiscount;
  const isOrderBlocked = Boolean(preview && !preview.is_valid);

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-12 lg:gap-8">
      {/* Left column — Forms */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        {/* Teslimat Adresi — kayıtlı adres seçimi */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="font-heading text-lg font-bold text-charcoal">
            Teslimat Adresi
          </h2>

          {isLoadingAddresses ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Adresler yükleniyor...
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {addresses.map((address) => {
                const isSelected = selectedAddressId === address.id;
                const { label, icon: AddressIcon } = addressTypeMeta[address.address_type];

                return (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => selectAddress(address.id)}
                    aria-pressed={isSelected}
                    className={`relative flex flex-col items-start gap-1.5 rounded-2xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] ${
                      isSelected
                        ? "border-[#FF5000] bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF5000] text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                      <AddressIcon className="h-4 w-4" />
                      {label}
                    </span>
                    <span className="font-bold text-charcoal">
                      {address.full_name}
                    </span>
                    <span className="text-sm text-gray-600">
                      {address.neighborhood_display}, {address.district_display}
                      {address.city ? ` / ${address.city}` : ""}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-muted transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                <Plus className="h-6 w-6" />
                <span className="text-sm font-semibold">Yeni Adres Ekle</span>
              </button>
            </div>
          )}
        </section>

        {/* Sipariş Notu */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="font-heading text-lg font-bold text-charcoal">
            Sipariş Notu
          </h2>
          <textarea
            rows={2}
            value={courierNote}
            onChange={(e) => setCourierNote(e.target.value)}
            placeholder="Kurye için not (opsiyonel), örn: Zili çalmayın"
            className="mt-4 w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </section>

        {/* Ödeme Yöntemi */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="font-heading text-lg font-bold text-charcoal">
            Ödeme Yöntemi
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              aria-pressed={paymentMethod === "cash"}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 px-5 py-6 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] ${
                paymentMethod === "cash"
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Banknote
                className={`h-9 w-9 ${paymentMethod === "cash" ? "text-primary" : "text-muted"}`}
              />
              <span className="text-base font-bold text-charcoal">
                Kapıda Nakit Ödeme
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              aria-pressed={paymentMethod === "card"}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 px-5 py-6 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] ${
                paymentMethod === "card"
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <CreditCard
                className={`h-9 w-9 ${paymentMethod === "card" ? "text-primary" : "text-muted"}`}
              />
              <span className="text-base font-bold text-charcoal">
                Kapıda Kredi Kartı
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* Right column — Order summary */}
      <div className="lg:col-span-4">
        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6 lg:sticky lg:top-24">
          <h2 className="font-heading text-lg font-bold text-charcoal">
            Sipariş Özeti
          </h2>

          <ul className="flex max-h-64 flex-col gap-3 overflow-y-auto">
            {items.map((item) => (
              <li key={item.cartItemId} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-offwhite">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="48px"
                    unoptimized={isSupabaseUrl(item.image)}
                    className="object-cover mix-blend-multiply"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-1 text-sm font-semibold text-charcoal">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted">
                    {item.quantity} adet
                  </span>
                </div>
                <span className="shrink-0 text-sm font-bold text-charcoal">
                  {formatCurrency(item.itemTotal)}
                </span>
              </li>
            ))}
          </ul>

          {/* Kupon Kodu */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Kupon Kodu"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm uppercase text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={isApplyingCoupon}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplyingCoupon && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Uygula
              </button>
            </div>
            {appliedCoupon && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-green-600">
                <Check className="h-3.5 w-3.5 shrink-0" />
                &quot;{appliedCoupon.code}&quot; kuponu uygulandı.
              </p>
            )}
            {couponError && (
              <p className="mt-1.5 text-xs font-bold text-red-600">{couponError}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex items-center justify-between text-muted">
              <span>Ara Toplam</span>
              <span className="font-semibold text-charcoal">
                {formatCurrency(cartSubtotal)}
              </span>
            </div>
            {appliedCoupon && (
              <div className="flex items-center justify-between text-green-600">
                <span>İndirim ({appliedCoupon.code})</span>
                <span className="font-semibold">-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-muted">
              <span>
                Teslimat Ücreti
                {distanceKm !== null && (
                  <span className="ml-1 text-xs text-gray-400">
                    (Mesafe: {distanceKm.toFixed(1)} km)
                  </span>
                )}
              </span>
              <span className="font-semibold text-charcoal">
                {isPreviewLoading ? "..." : formatCurrency(deliveryFee)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-base">
              <span className="font-bold text-charcoal">Genel Toplam</span>
              <span className="font-extrabold text-primary">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {isOrderBlocked && preview && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {preview.message}
            </div>
          )}

          <label className="flex items-start gap-2.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={hasAcceptedTerms}
              onChange={(e) => setHasAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span>
              <button
                type="button"
                onClick={() => openLegalDoc("on-bilgilendirme-formu")}
                className="font-bold text-primary hover:underline"
              >
                Ön Bilgilendirme Formu&apos;nu
              </button>{" "}
              ve{" "}
              <button
                type="button"
                onClick={() => openLegalDoc("mesafeli-satis-sozlesmesi")}
                className="font-bold text-primary hover:underline"
              >
                Mesafeli Satış Sözleşmesi&apos;ni
              </button>{" "}
              okudum, onaylıyorum.
            </span>
          </label>

          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={
              isSubmitting ||
              !hasAcceptedTerms ||
              !selectedAddressId ||
              isPreviewLoading ||
              isOrderBlocked
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5000] py-4 text-base font-bold text-white shadow-card transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Sipariş Oluşturuluyor..." : "Siparişi Onayla"}
          </button>
        </section>
      </div>

      {/* Ön Bilgilendirme Formu / Mesafeli Satış Sözleşmesi okuma modalı */}
      {activeLegalDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={legalDocMeta[activeLegalDoc].title}
          onClick={closeLegalDoc}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-popover"
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                {legalDocMeta[activeLegalDoc].title}
              </h2>
              <button
                type="button"
                onClick={closeLegalDoc}
                aria-label="Kapat"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-offwhite hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-charcoal">
              {isLoadingLegalDocs ? (
                <div className="flex items-center gap-2 text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sözleşme metni yükleniyor...
                </div>
              ) : legalDocs ? (
                <div
                  className="space-y-3 [&_p]:leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: legalDocs[legalDocMeta[activeLegalDoc].field],
                  }}
                />
              ) : (
                <p className="text-muted">Sözleşme metni alınamadı.</p>
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={closeLegalDoc}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5000] py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Okudum, Anladım
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Adres Ekle modalı */}
      {isAddressModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Yeni Adres Ekle"
          onClick={() => setIsAddressModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-popover"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-charcoal">
                Yeni Adres Ekle
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-offwhite hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAddress} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Adres Tipi
                </span>
                <select
                  value={newAddressForm.address_type}
                  onChange={(e) =>
                    setNewAddressForm((form) => ({
                      ...form,
                      address_type: e.target.value as Address["address_type"],
                    }))
                  }
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                >
                  <option value="home">Ev</option>
                  <option value="work">İş</option>
                  <option value="billing">Diğer</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Ad Soyad
                </span>
                <input
                  required
                  type="text"
                  value={newAddressForm.full_name}
                  onChange={(e) =>
                    setNewAddressForm((form) => ({ ...form, full_name: e.target.value }))
                  }
                  placeholder="Adınız Soyadınız"
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Telefon
                </span>
                <input
                  required
                  type="tel"
                  value={newAddressForm.phone}
                  onChange={(e) =>
                    setNewAddressForm((form) => ({ ...form, phone: e.target.value }))
                  }
                  placeholder="05XX XXX XX XX"
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  İlçe
                </span>
                <select
                  required
                  value={newAddressForm.district}
                  onChange={(e) =>
                    setNewAddressForm((form) => ({
                      ...form,
                      district: e.target.value,
                      neighborhood: "",
                    }))
                  }
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                >
                  <option value="" disabled>
                    İlçe seçin
                  </option>
                  {(addressLocations?.districts ?? []).map((district) => (
                    <option key={district.value} value={district.value}>
                      {district.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Mahalle
                </span>
                <select
                  required
                  disabled={!newAddressForm.district}
                  value={newAddressForm.neighborhood}
                  onChange={(e) =>
                    setNewAddressForm((form) => ({ ...form, neighborhood: e.target.value }))
                  }
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-offwhite disabled:text-muted"
                >
                  <option value="" disabled>
                    {newAddressForm.district ? "Mahalle seçin" : "Önce ilçe seçin"}
                  </option>
                  {(
                    addressLocations?.districts.find((d) => d.value === newAddressForm.district)
                      ?.neighborhoods ?? []
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">
                  Açık Adres
                </span>
                <textarea
                  required
                  rows={3}
                  value={newAddressForm.street}
                  onChange={(e) =>
                    setNewAddressForm((form) => ({ ...form, street: e.target.value }))
                  }
                  placeholder="Sokak, bina no, daire no..."
                  className="resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                  Mevcut Konumumu Kullan
                </button>
                {newAddressForm.latitude !== null && newAddressForm.longitude !== null && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-green-600">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    Konum alındı — teslimat mesafesi buna göre hesaplanacak.
                  </p>
                )}
                <p className="mt-1.5 text-xs text-muted">
                  Teslimat ücreti mesafeye göre hesaplandığı için konum paylaşımı zorunludur.
                </p>
              </div>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingAddress ||
                    newAddressForm.latitude === null ||
                    newAddressForm.longitude === null
                  }
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FF5000] py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingAddress && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
