"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { getTotalPages } from "@/lib/pagination";
import { ApiError } from "@/lib/apiClient";
import {
  createStaff,
  fetchStaff,
  resetStaffPassword,
  updateStaff,
  type CreateStaffPayload,
  type StaffMember,
  type StaffRole,
} from "@/lib/api/adminUsers";

const assignableRoles: { value: StaffRole; label: string }[] = [
  { value: "MARKET_OWNER", label: "Market Sahibi" },
  { value: "COURIER_MANAGER", label: "Kurye Yöneticisi" },
];

const roleBadgeClasses: Record<string, string> = {
  MARKET_OWNER: "bg-orange-100 text-orange-700",
  COURIER_MANAGER: "bg-slate-100 text-slate-700",
  ADMIN: "bg-charcoal text-white",
};

const PAGE_SIZE = 20;

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone_number: "",
  role: "MARKET_OWNER" as StaffRole,
  store_name: "",
};

type ToastState = { type: "success" | "error"; message: string } | null;

export default function AdminKullanicilarPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde önceki personel
  // listesi anında gösterilir, arka planda tazelenir.
  const { data, isLoading, mutate } = useSWR(
    ["admin-staff", debouncedSearch, page],
    ([, searchValue, pageValue]: [string, string, number]) =>
      fetchStaff({ search: searchValue || undefined, page: pageValue, pageSize: PAGE_SIZE }),
    {
      onError: (error) =>
        showToast("error", error instanceof ApiError ? error.message : "Personel listesi alınamadı."),
    }
  );
  const staff = data?.results ?? [];
  const count = data?.count ?? 0;

  const openAddModal = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (member: StaffMember) => {
    if (member.role === "ADMIN") return;
    setEditingStaff(member);
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      phone_number: member.phone_number ?? "",
      role: member.role as StaffRole,
      store_name: "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const openResetModal = (member: StaffMember) => {
    setResetTarget(member);
    setTempPassword("");
  };

  const closeResetModal = () => setResetTarget(null);

  const handleResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetTarget) return;
    setIsResetting(true);
    try {
      await resetStaffPassword(resetTarget.id, tempPassword);
      showToast("success", `${resetTarget.name} için yeni geçici şifre belirlendi.`);
      setResetTarget(null);
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Şifre sıfırlanamadı.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingStaff) {
        await updateStaff(editingStaff.id, {
          name: form.name,
          email: form.email,
          phone_number: form.phone_number || null,
          role: form.role,
        });
        showToast("success", `${form.name} bilgileri güncellendi.`);
      } else {
        const payload: CreateStaffPayload = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          ...(form.phone_number ? { phone_number: form.phone_number } : {}),
          ...(form.role === "MARKET_OWNER" && form.store_name ? { store_name: form.store_name } : {}),
        };
        await createStaff(payload);
        showToast("success", `${form.name} sisteme yetkili kullanıcı olarak eklendi.`);
      }
      setIsModalOpen(false);
      mutate();
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "İşlem gerçekleştirilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-bold shadow-popover ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-black text-gray-900">Kullanıcı &amp; Personel</h1>
        <button
          type="button"
          onClick={openAddModal}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Yeni Personel Ekle
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim, kullanıcı adı veya e-posta ara..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-muted">
          Bu aramaya uygun personel bulunamadı.
        </div>
      ) : (
        <>
          {/* Masaüstü: Veri Tablosu */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Ad Soyad</th>
                  <th className="px-4 py-3">E-posta</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-t border-gray-100 transition hover:bg-orange-50/40">
                    <td className="px-4 py-3 font-bold text-charcoal">{member.name}</td>
                    <td className="px-4 py-3 text-muted">{member.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${roleBadgeClasses[member.role] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {member.role_display}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                          member.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {member.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openResetModal(member)}
                          disabled={member.role === "ADMIN"}
                          aria-label={`${member.name} için şifreyi sıfırla`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          disabled={member.role === "ADMIN"}
                          aria-label={`${member.name} düzenle`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil: Kompakt Kartlar */}
          <div className="space-y-3 md:hidden">
            {staff.map((member) => (
              <div key={member.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-bold text-charcoal">{member.name}</p>
                      <p className="text-xs text-muted">{member.email}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                      member.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {member.is_active ? "Aktif" : "Pasif"}
                  </span>
                </div>

                <div className="mb-3 border-t border-gray-100 pt-2">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${roleBadgeClasses[member.role] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {member.role_display}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openResetModal(member)}
                    disabled={member.role === "ADMIN"}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-muted transition hover:border-orange-500 hover:text-orange-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Şifre Sıfırla
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(member)}
                    disabled={member.role === "ADMIN"}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-muted transition hover:border-orange-500 hover:text-orange-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Düzenle
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={getTotalPages(count, PAGE_SIZE)}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                {editingStaff ? "Personeli Düzenle" : "Yeni Personel Ekle"}
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
              <div>
                <label htmlFor="staff-name" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Ad Soyad
                </label>
                <input
                  id="staff-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label htmlFor="staff-email" className="mb-1.5 block text-sm font-bold text-charcoal">
                  E-posta
                </label>
                <input
                  id="staff-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label htmlFor="staff-phone" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Telefon Numarası {form.role === "MARKET_OWNER" && !editingStaff && "(Zorunlu)"}
                </label>
                <input
                  id="staff-phone"
                  type="tel"
                  required={form.role === "MARKET_OWNER" && !editingStaff}
                  value={form.phone_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="05xx xxx xx xx"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label htmlFor="staff-password" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Geçici Şifre
                  </label>
                  <input
                    id="staff-password"
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div>
                <label htmlFor="staff-role" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Rol
                </label>
                <select
                  id="staff-role"
                  required
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as StaffRole }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  {assignableRoles.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {!editingStaff && form.role === "MARKET_OWNER" && (
                <div>
                  <label htmlFor="staff-store-name" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Market Adı
                  </label>
                  <input
                    id="staff-store-name"
                    type="text"
                    value={form.store_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, store_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeResetModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">
                Kullanıcı İçin Şifre Sıfırla
              </h2>
              <button
                type="button"
                onClick={closeResetModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4 px-5 py-5">
              <p className="text-sm text-muted">
                <span className="font-bold text-charcoal">{resetTarget.name}</span> için yeni bir
                geçici şifre belirleyin.
              </p>

              <div>
                <label htmlFor="temp-password" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Yeni Geçici Şifre
                </label>
                <input
                  id="temp-password"
                  type="text"
                  required
                  minLength={6}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Örn. Gecici2026!"
                />
                <p className="mt-1.5 text-xs text-muted">
                  Kullanıcıya bu şifreyi iletişim kanallarından (WhatsApp vb.) iletin. Giriş
                  yaptıktan sonra kendi hesap ayarlarından değiştirmelidir.
                </p>
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isResetting && <Loader2 className="h-4 w-4 animate-spin" />}
                Şifreyi Güncelle
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
