"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Check,
  Home,
  Loader2,
  LocateFixed,
  Lock,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Plus,
  Star,
  Trash2,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { useAuthStore } from "@/store/useAuthStore";
import { useAddressStore } from "@/store/useAddressStore";
import { useToastStore } from "@/store/useToastStore";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/format";
import { getTotalPages } from "@/lib/pagination";
import { changeMyPassword, updateMyProfile } from "@/lib/api/users";
import { fetchMyOrders, type OrderDetail } from "@/lib/api/orders";
import {
  createAddress,
  deleteAddress,
  fetchAddressLocations,
  fetchAddresses,
  updateAddress,
  type Address,
  type AddressLocations,
} from "@/lib/api/addresses";
import {
  deleteComment,
  fetchMyComments,
  updateComment,
  type ProductReview,
} from "@/lib/api/comments";
import { fetchProductById } from "@/lib/api/products";

type AccountTab = "profile" | "orders" | "addresses" | "reviews" | "password";

const TABS: { key: AccountTab; label: string; icon: LucideIcon }[] = [
  { key: "profile", label: "Profil Bilgilerim", icon: User },
  { key: "orders", label: "Siparişlerim", icon: Package },
  { key: "addresses", label: "Adreslerim", icon: MapPin },
  { key: "reviews", label: "Değerlendirmelerim", icon: Star },
  { key: "password", label: "Şifre Değiştir", icon: Lock },
];

const addressTypeMeta: Record<Address["address_type"], { label: string; icon: LucideIcon }> = {
  home: { label: "Ev", icon: Home },
  work: { label: "İş", icon: Briefcase },
  billing: { label: "Diğer", icon: MapPin },
};

const ORDERS_PAGE_SIZE = 10;

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

const statusBadgeClasses: Record<string, string> = {
  RECEIVED: "bg-gray-100 text-gray-600",
  PREPARING: "bg-orange-50 text-primary",
  WAITING_COURIER: "bg-amber-50 text-amber-700",
  HANDED_TO_COURIER: "bg-blue-50 text-blue-600",
  ON_THE_WAY: "bg-blue-50 text-blue-600",
  DELIVERED: "bg-green-50 text-green-600",
  CANCELED: "bg-red-50 text-red-600",
};

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

// Değerlendirme, ürünü sadece ID ile tanır (`ProductReview.product`); ekranda
// ürün adını göstermek için tekil ürünleri toplu olarak (bir kez) çözer.
interface ReviewWithProduct extends ProductReview {
  productName: string;
  productSlug: string | null;
}

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const authUser = useAuthStore((state) => state.user);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const logout = useAuthStore((state) => state.logout);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    // `AuthBootstrap` oturumu token'dan geri yüklerken (`isBootstrapping`)
    // henüz "giriş yapılmamış" kararı verilmez — aksi halde geçerli bir
    // oturumu olan müşteri her sayfa yenilemesinde anasayfaya atılıp giriş
    // modalıyla karşılaşırdı.
    if (isBootstrapping) return;
    if (!isAuthenticated) {
      openAuthModal();
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapping, isAuthenticated]);

  // Header'daki "Yeni Adres Ekle" boş-durum bağlantısı `?tab=addresses` ile
  // buraya gelir ve doğrudan Adreslerim sekmesini açar.
  const [activeTab, setActiveTab] = useState<AccountTab>(
    (searchParams.get("tab") as AccountTab) || "profile"
  );

  // --- Profil Bilgilerim ---
  const [profileForm, setProfileForm] = useState({
    first_name: authUser?.firstName ?? "",
    last_name: authUser?.lastName ?? "",
    email: authUser?.email ?? "",
    phone_number: authUser?.phoneNumber ?? "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    setProfileForm({
      first_name: authUser?.firstName ?? "",
      last_name: authUser?.lastName ?? "",
      email: authUser?.email ?? "",
      phone_number: authUser?.phoneNumber ?? "",
    });
  }, [authUser]);

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateMyProfile(profileForm);
      await fetchCurrentUser();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (error) {
      showError(error, "Profil güncellenemedi.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Siparişlerim ---
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    if (activeTab !== "orders") return;
    setIsLoadingOrders(true);
    fetchMyOrders(ordersPage, ORDERS_PAGE_SIZE)
      .then((data) => {
        setOrders(data.results);
        setOrdersCount(data.count);
      })
      .catch((error) => showError(error, "Siparişleriniz alınamadı."))
      .finally(() => setIsLoadingOrders(false));
  }, [activeTab, ordersPage]);

  // --- Adreslerim ---
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [addressLocations, setAddressLocations] = useState<AddressLocations | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | "new" | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab !== "addresses") return;
    setIsLoadingAddresses(true);
    Promise.all([fetchAddresses(), fetchAddressLocations()])
      .then(([addressList, locations]) => {
        setAddresses(addressList);
        setAddressLocations(locations);
      })
      .catch((error) => showError(error, "Adresler alınamadı."))
      .finally(() => setIsLoadingAddresses(false));
  }, [activeTab]);

  const startEditAddress = (address: Address) => {
    setAddressForm({
      address_type: address.address_type,
      full_name: address.full_name,
      phone: address.phone ?? "",
      district: address.district,
      neighborhood: address.neighborhood,
      street: address.street ?? address.address_line ?? "",
      latitude: address.latitude ? Number(address.latitude) : null,
      longitude: address.longitude ? Number(address.longitude) : null,
    });
    setEditingAddressId(address.id);
  };

  const startNewAddress = () => {
    setAddressForm(emptyAddressForm);
    setEditingAddressId("new");
  };

  const cancelAddressEdit = () => setEditingAddressId(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      useToastStore.getState().showToast("error", "Tarayıcınız konum paylaşımını desteklemiyor.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAddressForm((form) => ({
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

  const handleAddressFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addressForm.district || !addressForm.neighborhood) {
      useToastStore.getState().showToast("error", "Lütfen ilçe ve mahalle seçin.");
      return;
    }
    if (addressForm.latitude === null || addressForm.longitude === null) {
      useToastStore
        .getState()
        .showToast("error", "Teslimat mesafesi hesaplanabilmesi için önce konumunuzu paylaşın.");
      return;
    }

    setIsSavingAddress(true);
    try {
      const payload = {
        full_name: addressForm.full_name,
        phone: addressForm.phone,
        street: addressForm.street,
        district: addressForm.district,
        neighborhood: addressForm.neighborhood,
        address_type: addressForm.address_type,
        latitude: addressForm.latitude,
        longitude: addressForm.longitude,
      };
      if (editingAddressId === "new") {
        const created = await createAddress(payload);
        setAddresses((prev) => [...prev, created]);
        // Header'daki "Teslimat adresi" dropdown'u (useAddressStore) da anında
        // güncellensin diye yeni adres global store'a da eklenir.
        useAddressStore.getState().addAddress(created);
        useToastStore.getState().showToast("success", "Adres eklendi.");
      } else if (typeof editingAddressId === "number") {
        const updated = await updateAddress(editingAddressId, payload);
        setAddresses((prev) => prev.map((a) => (a.id === editingAddressId ? updated : a)));
        useAddressStore.getState().fetchAddresses();
        useToastStore.getState().showToast("success", "Adres güncellendi.");
      }
      setEditingAddressId(null);
    } catch (error) {
      showError(error, "Adres kaydedilemedi.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const confirmDeleteAddress = async () => {
    if (deletingAddressId === null) return;
    try {
      await deleteAddress(deletingAddressId);
      setAddresses((prev) => prev.filter((a) => a.id !== deletingAddressId));
      useAddressStore.getState().fetchAddresses();
      useToastStore.getState().showToast("success", "Adres silindi.");
    } catch (error) {
      showError(error, "Adres silinemedi.");
    } finally {
      setDeletingAddressId(null);
    }
  };

  // --- Değerlendirmelerim ---
  const [myReviews, setMyReviews] = useState<ReviewWithProduct[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [editingReview, setEditingReview] = useState<ReviewWithProduct | null>(null);
  const [reviewModalRating, setReviewModalRating] = useState(0);
  const [reviewModalComment, setReviewModalComment] = useState("");
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab !== "reviews" || !authUser) return;
    setIsLoadingReviews(true);
    fetchMyComments(authUser.id)
      .then(async (reviews) => {
        const uniqueProductIds = Array.from(new Set(reviews.map((r) => r.product)));
        const products = await Promise.all(
          uniqueProductIds.map((id) =>
            fetchProductById(id).catch(() => null)
          )
        );
        const productById = new Map(
          uniqueProductIds.map((id, i) => [id, products[i]] as const)
        );
        setMyReviews(
          reviews.map((review) => ({
            ...review,
            productName: productById.get(review.product)?.name ?? `Ürün #${review.product}`,
            productSlug: productById.get(review.product)?.slug ?? null,
          }))
        );
      })
      .catch((error) => showError(error, "Değerlendirmeleriniz alınamadı."))
      .finally(() => setIsLoadingReviews(false));
  }, [activeTab, authUser]);

  const openEditReviewModal = (review: ReviewWithProduct) => {
    setEditingReview(review);
    setReviewModalRating(review.rating);
    setReviewModalComment(review.comment ?? "");
  };

  const closeEditReviewModal = () => setEditingReview(null);

  const handleSaveReview = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingReview || reviewModalRating === 0) return;
    setIsSavingReview(true);
    try {
      const updated = await updateComment(editingReview.id, {
        rating: reviewModalRating,
        comment: reviewModalComment || null,
      });
      setMyReviews((prev) =>
        prev.map((r) => (r.id === editingReview.id ? { ...r, ...updated } : r))
      );
      useToastStore.getState().showToast("success", "Değerlendirmeniz güncellendi.");
      setEditingReview(null);
    } catch (error) {
      showError(error, "Değerlendirme güncellenemedi.");
    } finally {
      setIsSavingReview(false);
    }
  };

  const confirmDeleteReview = async () => {
    if (deletingReviewId === null) return;
    try {
      await deleteComment(deletingReviewId);
      setMyReviews((prev) => prev.filter((r) => r.id !== deletingReviewId));
      useToastStore.getState().showToast("success", "Değerlendirme silindi.");
    } catch (error) {
      showError(error, "Değerlendirme silinemedi.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  // --- Şifre Değiştir ---
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.new_password_confirm) {
      setPasswordMessage({ type: "error", text: "Yeni şifreler birbiriyle eşleşmiyor." });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await changeMyPassword(passwordForm);
      setPasswordMessage({ type: "success", text: "Şifreniz başarıyla değiştirildi." });
      setPasswordForm({ old_password: "", new_password: "", new_password_confirm: "" });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Şifre güncellenemedi.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const renderAddressForm = () => (
    <form onSubmit={handleAddressFormSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-charcoal">Adres Tipi</span>
        <select
          value={addressForm.address_type}
          onChange={(e) =>
            setAddressForm((f) => ({ ...f, address_type: e.target.value as Address["address_type"] }))
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        >
          <option value="home">Ev</option>
          <option value="work">İş</option>
          <option value="billing">Diğer</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-charcoal">Ad Soyad</span>
        <input
          required
          type="text"
          value={addressForm.full_name}
          onChange={(e) => setAddressForm((f) => ({ ...f, full_name: e.target.value }))}
          placeholder="Adınız Soyadınız"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-charcoal">Telefon</span>
        <input
          required
          type="tel"
          value={addressForm.phone}
          onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="05XX XXX XX XX"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-charcoal">İlçe</span>
        <select
          required
          value={addressForm.district}
          onChange={(e) =>
            setAddressForm((f) => ({ ...f, district: e.target.value, neighborhood: "" }))
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
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
        <span className="text-xs font-semibold text-charcoal">Mahalle</span>
        <select
          required
          disabled={!addressForm.district}
          value={addressForm.neighborhood}
          onChange={(e) => setAddressForm((f) => ({ ...f, neighborhood: e.target.value }))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-offwhite disabled:text-muted"
        >
          <option value="" disabled>
            {addressForm.district ? "Mahalle seçin" : "Önce ilçe seçin"}
          </option>
          {(
            addressLocations?.districts.find((d) => d.value === addressForm.district)
              ?.neighborhoods ?? []
          ).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-charcoal">Açık Adres</span>
        <textarea
          required
          rows={3}
          value={addressForm.street}
          onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))}
          placeholder="Sokak, bina no, kat, daire ve diğer adres detayları..."
          className="resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500 py-2.5 text-sm font-bold text-orange-500 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          Mevcut Konumumu Kullan
        </button>
        {addressForm.latitude !== null && addressForm.longitude !== null && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-green-600">
            <Check className="h-3.5 w-3.5 shrink-0" />
            Konum alındı — teslimat mesafesi buna göre hesaplanacak.
          </p>
        )}
      </div>

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={cancelAddressEdit}
          disabled={isSavingAddress}
          className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-bold text-charcoal transition hover:bg-offwhite active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={isSavingAddress}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#FF5000] py-2 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSavingAddress && <Loader2 className="h-4 w-4 animate-spin" />}
          Kaydet
        </button>
      </div>
    </form>
  );

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full px-4 py-6 lg:px-8 lg:py-10">
      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900 sm:text-3xl">
        Hesabım
      </h1>

      <div className="lg:flex lg:items-start lg:gap-8">
        {/* Sol menü */}
        <aside className="mb-6 lg:mb-0 lg:w-1/4">
          <nav className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-3 shadow-soft lg:sticky lg:top-24">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-charcoal hover:bg-offwhite"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={logout}
              className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 active:scale-[0.98]"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Çıkış Yap
            </button>
          </nav>
        </aside>

        {/* Sağ içerik */}
        <div className="lg:w-3/4">
          {activeTab === "profile" && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                Profil Bilgilerim
              </h2>
              <form onSubmit={handleProfileSubmit} className="mt-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-charcoal">Kullanıcı Adı</span>
                    <input
                      type="text"
                      value={authUser?.username ?? ""}
                      disabled
                      className="cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-muted"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-charcoal">E-posta</span>
                    <input
                      required
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                      className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-charcoal">Adı</span>
                    <input
                      type="text"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
                      className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-charcoal">Soyadı</span>
                    <input
                      type="text"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))}
                      className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-semibold text-charcoal">Telefon Numarası</span>
                    <input
                      type="tel"
                      value={profileForm.phone_number ?? ""}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone_number: e.target.value }))}
                      placeholder="05XX XXX XX XX"
                      className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 rounded-xl bg-[#FF5000] px-6 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                    Kaydet
                  </button>
                  {profileSaved && (
                    <span className="text-sm font-semibold text-green-600">
                      Bilgileriniz güncellendi.
                    </span>
                  )}
                </div>
              </form>
            </section>
          )}

          {activeTab === "orders" && (
            <section className="flex flex-col gap-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                Siparişlerim
              </h2>

              {isLoadingOrders ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-muted">
                  Henüz bir siparişiniz yok.
                </div>
              ) : (
                <>
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-charcoal">
                          Sipariş No: #{order.id}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(order.created).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusBadgeClasses[order.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.status_display}
                        </span>
                        <span className="text-base font-bold text-charcoal">
                          {formatCurrency(order.order_total)}
                        </span>
                        <Link
                          href={`/siparis-takip/${order.id}`}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
                        >
                          Detayları Gör
                        </Link>
                      </div>
                    </div>
                  ))}

                  <Pagination
                    currentPage={ordersPage}
                    totalPages={getTotalPages(ordersCount, ORDERS_PAGE_SIZE)}
                    onPageChange={setOrdersPage}
                    className="mt-2"
                  />
                </>
              )}
            </section>
          )}

          {activeTab === "addresses" && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                Adreslerim
              </h2>

              {isLoadingAddresses ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {addresses.map((address) => {
                    const { label, icon: AddressIcon } = addressTypeMeta[address.address_type];
                    const isEditing = editingAddressId === address.id;

                    return (
                      <div
                        key={address.id}
                        className="flex flex-col gap-3 rounded-2xl border-2 border-gray-200 p-4"
                      >
                        {isEditing ? (
                          renderAddressForm()
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                                <AddressIcon className="h-4 w-4" />
                                {label}
                              </span>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditAddress(address)}
                                  aria-label={`${address.full_name} adresini düzenle`}
                                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-offwhite hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingAddressId(address.id)}
                                  aria-label={`${address.full_name} adresini sil`}
                                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 active:scale-90"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <span className="font-bold text-charcoal">{address.full_name}</span>
                            <span className="text-sm text-gray-600">
                              {address.neighborhood_display}, {address.district_display} / {address.city}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {editingAddressId === "new" ? (
                    <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary p-4">
                      {renderAddressForm()}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startNewAddress}
                      className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-muted transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
                    >
                      <Plus className="h-6 w-6" />
                      <span className="text-sm font-semibold">Yeni Adres Ekle</span>
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab === "reviews" && (
            <section className="flex flex-col gap-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                Değerlendirmelerim
              </h2>

              {isLoadingReviews ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : myReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-muted">
                  Henüz bir ürün değerlendirmesi yapmadınız.
                </div>
              ) : (
                myReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {review.productSlug ? (
                          <Link
                            href={`/urun/${review.productSlug}`}
                            className="truncate font-bold text-charcoal hover:text-primary hover:underline"
                          >
                            {review.productName}
                          </Link>
                        ) : (
                          <p className="truncate font-bold text-charcoal">{review.productName}</p>
                        )}
                        <div className="mt-1 flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? "fill-secondary text-secondary"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditReviewModal(review)}
                          aria-label={`${review.productName} değerlendirmesini düzenle`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-offwhite hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingReviewId(review.id)}
                          aria-label={`${review.productName} değerlendirmesini sil`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 active:scale-90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {review.comment && <p className="mt-3 text-sm text-gray-600">{review.comment}</p>}

                    <p className="mt-3 text-xs text-muted">
                      {new Date(review.created).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))
              )}
            </section>
          )}

          {activeTab === "password" && (
            <section className="max-w-lg rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                Şifre Değiştir
              </h2>
              <form onSubmit={handlePasswordSubmit} className="mt-4 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-charcoal">Eski Şifre</span>
                  <input
                    required
                    type="password"
                    value={passwordForm.old_password}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, old_password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-charcoal">Yeni Şifre</span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, new_password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-charcoal">Yeni Şifre (Tekrar)</span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={passwordForm.new_password_confirm}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, new_password_confirm: e.target.value }))
                    }
                    placeholder="••••••••"
                    className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                {passwordMessage && (
                  <p
                    className={`text-sm font-semibold ${
                      passwordMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {passwordMessage.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#FF5000] py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isUpdatingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  Şifreyi Değiştir
                </button>
              </form>
            </section>
          )}
        </div>
      </div>

      {/* Adres silme onay modalı */}
      {deletingAddressId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Adresi Sil"
          onClick={() => setDeletingAddressId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover"
          >
            <h2 className="font-heading text-lg font-bold text-charcoal">Adresi Sil</h2>
            <p className="mt-2 text-sm text-gray-600">
              Bu adresi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingAddressId(null)}
                className="flex-1 rounded-xl border border-gray-300 bg-gray-100 py-2.5 text-sm font-bold text-charcoal transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAddress}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Değerlendirme düzenleme modalı */}
      {editingReview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Değerlendirmeyi Düzenle"
          onClick={closeEditReviewModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover"
          >
            <h3 className="text-center font-heading text-lg font-bold text-charcoal">
              {editingReview.productName}
            </h3>
            <p className="mt-1 text-center text-sm text-muted">
              Değerlendirmenizi güncelleyin
            </p>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewModalRating(star)}
                  aria-label={`${star} yıldız ver`}
                  aria-pressed={star <= reviewModalRating}
                  className="p-1 transition active:scale-90"
                >
                  <Star
                    className={`h-8 w-8 transition ${
                      star <= reviewModalRating
                        ? "fill-secondary text-secondary"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveReview} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-charcoal">Yorumunuz</span>
                <textarea
                  rows={4}
                  maxLength={200}
                  value={reviewModalComment}
                  onChange={(e) => setReviewModalComment(e.target.value)}
                  placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
                  className="resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeEditReviewModal}
                  disabled={isSavingReview}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-charcoal transition hover:bg-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={reviewModalRating === 0 || isSavingReview}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FF5000] py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                  Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Değerlendirme silme onay modalı */}
      {deletingReviewId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Değerlendirmeyi Sil"
          onClick={() => setDeletingReviewId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover"
          >
            <h2 className="font-heading text-lg font-bold text-charcoal">
              Değerlendirmeyi Sil
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Bu değerlendirmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingReviewId(null)}
                className="flex-1 rounded-xl border border-gray-300 bg-gray-100 py-2.5 text-sm font-bold text-charcoal transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmDeleteReview}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageContent />
    </Suspense>
  );
}
