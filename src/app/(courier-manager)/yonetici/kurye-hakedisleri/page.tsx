"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bike, CheckCircle2, Car, Wallet, X } from "lucide-react";

interface CourierEarning {
  id: number;
  name: string;
  vehicleType: string;
  completedPackages: number;
}

// Backend mimarimizde kurye, teslimat başına sabit ücret kazanır (bkz.
// BACKEND_TODO.md) — hakediş her zaman "tamamlanan paket * 70 ₺"dir.
const FLAT_COURIER_FEE = 70;

const mockCourierEarnings: CourierEarning[] = [
  { id: 1, name: "Ahmet Yılmaz", vehicleType: "Motosiklet", completedPackages: 40 },
  { id: 2, name: "Mehmet Kaya", vehicleType: "Motosiklet", completedPackages: 35 },
  { id: 3, name: "Ali Vural", vehicleType: "Bisiklet", completedPackages: 18 },
  { id: 4, name: "Burcu Şahin", vehicleType: "Motosiklet", completedPackages: 28 },
  { id: 5, name: "Emre Koç", vehicleType: "Otomobil", completedPackages: 22 },
];

const vehicleIcons: Record<string, typeof Bike> = {
  Motosiklet: Bike,
  Bisiklet: Bike,
  Otomobil: Car,
};

export default function CourierEarningsPage() {
  const router = useRouter();

  const totalPayout = mockCourierEarnings.reduce(
    (sum, c) => sum + c.completedPackages * FLAT_COURIER_FEE,
    0
  );

  const [payingCourier, setPayingCourier] = useState<CourierEarning | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast(message);
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  const openPaymentModal = (courier: CourierEarning) => {
    setPayingCourier(courier);
    setPaymentAmount("");
  };

  const closePaymentModal = () => setPayingCourier(null);

  const handleSubmitPayment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payingCourier) return;

    const maxAmount = payingCourier.completedPackages * FLAT_COURIER_FEE;
    const amount = Math.min(Number(paymentAmount), maxAmount);
    if (amount <= 0) return;

    showToast(`${payingCourier.name} için ${amount.toLocaleString("tr-TR")} ₺ ödeme bildirildi.`);
    setPayingCourier(null);
  };

  return (
    <div>
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 shadow-popover"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {toast}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => router.push("/yonetici/panel")}
        className="mb-5 flex items-center gap-1.5 text-sm font-bold text-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        Geri Dön
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-heading text-2xl font-black text-gray-900">
          Kurye Hakediş ve Performans Raporu
        </h1>

        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-600">Toplam Ödenecek Tutar</p>
            <p className="font-heading text-xl font-black text-red-700">
              {totalPayout.toLocaleString("tr-TR")} ₺
            </p>
          </div>
        </div>
      </div>

      {/* Masaüstü: tablo */}
      <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Kurye Adı</th>
              <th className="px-5 py-3">Araç Tipi</th>
              <th className="px-5 py-3">Tamamlanan Paket</th>
              <th className="px-5 py-3">Birim Ücret</th>
              <th className="px-5 py-3">Toplam Hakediş</th>
              <th className="px-5 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mockCourierEarnings.map((courier) => {
              const VehicleIcon = vehicleIcons[courier.vehicleType] ?? Bike;
              const earning = courier.completedPackages * FLAT_COURIER_FEE;
              return (
                <tr key={courier.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-muted">
                        <VehicleIcon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-charcoal">{courier.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">{courier.vehicleType}</td>
                  <td className="px-5 py-3 text-muted">{courier.completedPackages} paket</td>
                  <td className="px-5 py-3 text-muted">{FLAT_COURIER_FEE.toLocaleString("tr-TR")} ₺</td>
                  <td className="px-5 py-3 font-heading font-black text-charcoal">
                    {earning.toLocaleString("tr-TR")} ₺
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => openPaymentModal(courier)}
                      className="whitespace-nowrap rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
                    >
                      Ödeme Bildir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobil: kart yapısı */}
      <div className="space-y-3 md:hidden">
        {mockCourierEarnings.map((courier) => {
          const VehicleIcon = vehicleIcons[courier.vehicleType] ?? Bike;
          const earning = courier.completedPackages * FLAT_COURIER_FEE;
          return (
            <div
              key={courier.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-muted">
                  <VehicleIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-heading text-base font-bold text-charcoal">{courier.name}</p>
                  <p className="text-xs text-muted">{courier.vehicleType}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                <span className="text-muted">Tamamlanan Paket</span>
                <span className="font-bold text-charcoal">{courier.completedPackages} paket</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted">Birim Ücret</span>
                <span className="font-bold text-charcoal">{FLAT_COURIER_FEE.toLocaleString("tr-TR")} ₺</span>
              </div>
              <div className="mb-3 flex items-center justify-between border-t border-gray-100 pt-2 text-sm">
                <span className="text-muted">Toplam Hakediş</span>
                <span className="font-heading text-lg font-black text-charcoal">
                  {earning.toLocaleString("tr-TR")} ₺
                </span>
              </div>
              <button
                type="button"
                onClick={() => openPaymentModal(courier)}
                className="w-full whitespace-nowrap rounded-lg bg-orange-500 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-orange-600 active:scale-95"
              >
                Ödeme Bildir
              </button>
            </div>
          );
        })}
      </div>

      {payingCourier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closePaymentModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-charcoal">Ödeme Bildir</h2>
              <button
                type="button"
                onClick={closePaymentModal}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-muted">{payingCourier.name} - Mevcut Hakediş</p>
                <p className="font-heading text-2xl font-black text-charcoal">
                  {(payingCourier.completedPackages * FLAT_COURIER_FEE).toLocaleString("tr-TR")} ₺
                </p>
              </div>

              <div>
                <label htmlFor="earnings-payment-amount" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Ödenen Tutar (₺)
                </label>
                <input
                  id="earnings-payment-amount"
                  type="number"
                  required
                  min={0.01}
                  max={payingCourier.completedPackages * FLAT_COURIER_FEE}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Hak edişin tamamı veya bir kısmı"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98]"
              >
                Kaydet ve Bildir
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
