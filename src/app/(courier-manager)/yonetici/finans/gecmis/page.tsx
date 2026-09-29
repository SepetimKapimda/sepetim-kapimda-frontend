"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import Pagination from "@/components/ui/Pagination";

type OutgoingTxnStatus = "Alıcı Onayı Bekliyor" | "Onaylandı";

interface OutgoingTransaction {
  id: number;
  date: string;
  courierName: string;
  amount: number;
  status: OutgoingTxnStatus;
}

const turkishMonthsFull = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function formatTurkishDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getDate()} ${turkishMonthsFull[date.getMonth()]} ${date.getFullYear()}`;
}

const outgoingHistory: OutgoingTransaction[] = [
  { id: 1, date: formatTurkishDate(0), courierName: "Ahmet Yılmaz", amount: 1500, status: "Alıcı Onayı Bekliyor" },
  { id: 2, date: formatTurkishDate(5), courierName: "Ahmet Yılmaz", amount: 2800, status: "Onaylandı" },
  { id: 3, date: formatTurkishDate(12), courierName: "Mehmet Kaya", amount: 2100, status: "Onaylandı" },
  { id: 4, date: formatTurkishDate(12), courierName: "Ali Vural", amount: 980, status: "Onaylandı" },
];

const outgoingStatusBadgeClasses: Record<OutgoingTxnStatus, string> = {
  "Alıcı Onayı Bekliyor": "bg-secondary/20 text-secondary-800",
  Onaylandı: "bg-green-100 text-green-700",
};

const TOTAL_PAGES = 3;

export default function CourierManagerFinansGecmisPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push("/yonetici/finans")}
        className="mb-5 flex items-center gap-1.5 text-sm font-bold text-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        Finans &amp; Ödenekler&apos;e Dön
      </button>

      <h1 className="mb-6 font-heading text-2xl font-black text-gray-900">Kurye Geçmiş Ödemeleri</h1>

      {/* Masaüstü: Veri Tablosu */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Kurye</th>
              <th className="px-4 py-3">Ödenen Tutar</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {outgoingHistory.map((txn) => (
              <tr key={txn.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-muted">{txn.date}</td>
                <td className="px-4 py-3 font-bold text-charcoal">{txn.courierName}</td>
                <td className="px-4 py-3 font-bold text-charcoal">
                  {txn.amount.toLocaleString("tr-TR")} ₺
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${outgoingStatusBadgeClasses[txn.status]}`}
                  >
                    {txn.status === "Alıcı Onayı Bekliyor" ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {txn.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil: Kompakt Kartlar */}
      <div className="space-y-3 md:hidden">
        {outgoingHistory.map((txn) => (
          <div key={txn.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-heading text-sm font-bold text-charcoal">{txn.courierName}</p>
                <p className="text-xs text-muted">{txn.date}</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${outgoingStatusBadgeClasses[txn.status]}`}
              >
                {txn.status === "Alıcı Onayı Bekliyor" ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {txn.status}
              </span>
            </div>
            <p className="font-heading text-lg font-black text-charcoal">
              {txn.amount.toLocaleString("tr-TR")} ₺
            </p>
          </div>
        ))}
      </div>

      {/* Sayfalama (görsel — gerçek sayfalama backend'de yapılacak) */}
      <Pagination
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        className="mt-6"
      />
    </div>
  );
}
