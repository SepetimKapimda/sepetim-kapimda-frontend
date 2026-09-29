"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Bike,
  Car,
  Loader2,
  Phone,
  Plus,
  Truck,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/store/useToastStore";
import {
  VEHICLE_TYPE_LABELS,
  createManagerCourier,
  deleteManagerCourier,
  fetchManagerCouriers,
  updateManagerCourier,
  type ManagerCourier,
  type VehicleType,
} from "@/lib/api/managerCouriers";

type CourierTab = "active" | "inactive";

const vehicleTypeOptions: VehicleType[] = ["motorcycle", "bicycle", "car"];

// Not: create/update isteklerinde kod (`motorcycle` vb.) gönderiliyor, ama GET
// yanıtları backend'in görünen adını (`vehicle_type: "Motosiklet"`) döndürüyor —
// bu yüzden ikon eşlemesi ve düzenleme formuna aktarım görünen adın içeriğine göre yapılıyor.
function getVehicleIcon(vehicleType: string): typeof Bike {
  const normalized = vehicleType.toLowerCase();
  if (normalized.includes("oto") || normalized.includes("car")) return Car;
  return Bike;
}

function toVehicleTypeCode(vehicleType: string): VehicleType {
  const normalized = vehicleType.toLowerCase();
  if (normalized.includes("oto") || normalized.includes("car")) return "car";
  if (normalized.includes("bisiklet") || normalized.includes("bicycle")) return "bicycle";
  return "motorcycle";
}

const emptyAddForm = {
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  plateNumber: "",
  vehicleType: "motorcycle" as VehicleType,
};

function showError(error: unknown, fallback: string) {
  useToastStore.getState().showToast("error", error instanceof ApiError ? error.message : fallback);
}

interface VehicleTypePillsProps {
  value: VehicleType;
  onChange: (value: VehicleType) => void;
}

function VehicleTypePills({ value, onChange }: VehicleTypePillsProps) {
  return (
    <div className="flex w-full gap-2">
      {vehicleTypeOptions.map((option) => {
        const isSelected = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={isSelected}
            className={`flex-1 rounded-lg border px-2 py-2.5 text-center text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] ${
              isSelected
                ? "border-orange-500 bg-orange-500 text-white shadow-md"
                : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {VEHICLE_TYPE_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}

export default function CourierManagerKuryelerPage() {
  const [couriers, setCouriers] = useState<ManagerCourier[]>([]);
  const [activeTab, setActiveTab] = useState<CourierTab>("active");
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  const [editingCourier, setEditingCourier] = useState<ManagerCourier | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    plateNumber: "",
    vehicleType: "motorcycle" as VehicleType,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadCouriers = (isActive: boolean) => {
    setIsLoading(true);
    fetchManagerCouriers(isActive)
      .then(setCouriers)
      .catch((error) => showError(error, "Kuryeler alınamadı."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCouriers(activeTab === "active");
  }, [activeTab]);

  const openAddModal = () => {
    setAddForm(emptyAddForm);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => setIsAddModalOpen(false);

  const handleAddSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingAdd(true);
    try {
      await createManagerCourier({
        username: addForm.username,
        password: addForm.password,
        first_name: addForm.firstName,
        last_name: addForm.lastName,
        email: addForm.email,
        phone_number: addForm.phone,
        vehicle_type: addForm.vehicleType,
        plate_number: addForm.plateNumber,
      });
      useToastStore.getState().showToast("success", `${addForm.firstName} adlı kurye başarıyla eklendi.`);
      setIsAddModalOpen(false);
      loadCouriers(true);
      setActiveTab("active");
    } catch (error) {
      showError(error, "Kurye eklenemedi.");
    } finally {
      setIsSavingAdd(false);
    }
  };

  const openEditModal = (courier: ManagerCourier) => {
    setEditingCourier(courier);
    setEditForm({
      firstName: courier.first_name,
      lastName: courier.last_name,
      phone: courier.phone_number ?? "",
      plateNumber: courier.plate_number,
      vehicleType: toVehicleTypeCode(courier.vehicle_type),
    });
  };

  const closeEditModal = () => setEditingCourier(null);

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCourier) return;
    setIsSavingEdit(true);
    try {
      await updateManagerCourier(editingCourier.id, {
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        phone_number: editForm.phone,
        plate_number: editForm.plateNumber,
        vehicle_type: editForm.vehicleType,
      });
      useToastStore.getState().showToast("success", `${editForm.firstName} bilgileri güncellendi.`);
      closeEditModal();
      loadCouriers(activeTab === "active");
    } catch (error) {
      showError(error, "Kurye güncellenemedi.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Aktif kuryeyi soft-delete (işten çıkar) eder; pasif kuryeyi `is_active:true` ile geri getirir.
  const handleToggleActive = async () => {
    if (!editingCourier) return;
    try {
      if (editingCourier.is_active) {
        await deleteManagerCourier(editingCourier.id);
        useToastStore.getState().showToast("success", `${editingCourier.first_name} işten çıkarıldı.`);
      } else {
        await updateManagerCourier(editingCourier.id, { is_active: true });
        useToastStore.getState().showToast("success", `${editingCourier.first_name} tekrar aktifleştirildi.`);
      }
      closeEditModal();
      loadCouriers(activeTab === "active");
    } catch (error) {
      showError(error, "İşlem gerçekleştirilemedi.");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-black text-gray-900">Kurye Listesi</h1>
        <button
          type="button"
          onClick={openAddModal}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Yeni Kurye Ekle
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            activeTab === "active" ? "bg-primary text-white" : "bg-gray-100 text-muted hover:bg-gray-200"
          }`}
        >
          Aktif Kuryeler
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("inactive")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            activeTab === "inactive" ? "bg-primary text-white" : "bg-gray-100 text-muted hover:bg-gray-200"
          }`}
        >
          Pasif (İşten Çıkarılmış) Kuryeler
        </button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : couriers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-muted">
          {activeTab === "active" ? "Aktif kurye bulunmuyor." : "Pasife alınmış kurye bulunmuyor."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {couriers.map((courier) => {
            const VehicleIcon = getVehicleIcon(courier.vehicle_type);
            return (
              <div
                key={courier.id}
                className={`rounded-2xl border bg-white p-4 shadow-card ${
                  courier.is_active ? "border-gray-100" : "border-dashed border-gray-200 opacity-70"
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-muted">
                      <VehicleIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-heading text-base font-bold text-charcoal">
                        {courier.first_name} {courier.last_name}
                      </p>
                      <p className="text-xs text-muted">{courier.vehicle_type}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                      !courier.is_active
                        ? "bg-gray-100 text-gray-400"
                        : courier.is_available
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {!courier.is_active ? "Pasif" : courier.is_available ? "Müsait" : "Molada"}
                  </span>
                </div>

                <div className="mb-1 flex items-center gap-1.5 text-sm text-muted">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {courier.phone_number ?? "-"}
                </div>
                <div className="mb-4 text-xs text-muted">
                  Toplam teslimat: <span className="font-bold text-charcoal">{courier.total_deliveries}</span>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => openEditModal(courier)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-muted transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
                  >
                    Düzenle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeAddModal}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-bold text-charcoal">Yeni Kurye Ekle</h2>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="courier-first-name" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Ad
                  </label>
                  <input
                    id="courier-first-name"
                    type="text"
                    required
                    value={addForm.firstName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="courier-last-name" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Soyad
                  </label>
                  <input
                    id="courier-last-name"
                    type="text"
                    required
                    value={addForm.lastName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="courier-username" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Kullanıcı Adı
                </label>
                <input
                  id="courier-username"
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="kadir.aslan"
                />
              </div>

              <div>
                <label htmlFor="courier-email" className="mb-1.5 block text-sm font-bold text-charcoal">
                  E-posta
                </label>
                <input
                  id="courier-email"
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="courier-password" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Şifre
                </label>
                <input
                  id="courier-password"
                  type="password"
                  required
                  minLength={6}
                  value={addForm.password}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="courier-phone" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Telefon
                  </label>
                  <input
                    id="courier-phone"
                    type="tel"
                    required
                    value={addForm.phone}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                <div>
                  <label htmlFor="courier-plate" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Plaka
                  </label>
                  <input
                    id="courier-plate"
                    type="text"
                    required
                    value={addForm.plateNumber}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, plateNumber: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="54 AB 123"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-bold text-charcoal">Araç Tipi</span>
                <VehicleTypePills
                  value={addForm.vehicleType}
                  onChange={(vehicleType) => setAddForm((prev) => ({ ...prev, vehicleType }))}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingAdd}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingAdd && <Loader2 className="h-4 w-4 animate-spin" />}
                Kuryeyi Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {editingCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeEditModal}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-bold text-charcoal">Kurye Düzenle</h2>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-courier-first-name" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Ad
                  </label>
                  <input
                    id="edit-courier-first-name"
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-courier-last-name" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Soyad
                  </label>
                  <input
                    id="edit-courier-last-name"
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-courier-phone" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Telefon
                  </label>
                  <input
                    id="edit-courier-phone"
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-courier-plate" className="mb-1.5 block text-sm font-bold text-charcoal">
                    Plaka
                  </label>
                  <input
                    id="edit-courier-plate"
                    type="text"
                    required
                    value={editForm.plateNumber}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, plateNumber: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-bold text-charcoal">Araç Tipi</span>
                <VehicleTypePills
                  value={editForm.vehicleType}
                  onChange={(vehicleType) => setEditForm((prev) => ({ ...prev, vehicleType }))}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] ${
                    editingCourier.is_active
                      ? "border-red-200 text-red-600 hover:bg-red-50 focus-visible:ring-red-200"
                      : "border-green-200 text-green-700 hover:bg-green-50 focus-visible:ring-green-200"
                  }`}
                >
                  {editingCourier.is_active ? (
                    <>
                      <UserX className="h-4 w-4" />
                      Kuryeyi Pasife Al
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Tekrar Aktifleştir
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
