"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const ELLIPSIS = "…" as const;
type PageItem = number | typeof ELLIPSIS;

// Çok sayfalı listelerde (ör. 38 sayfa) HER sayfa numarasını tek tek
// basmak mobilde konteyneri yatay olarak taşırıyordu (overflow). Bunun
// yerine "1 2 … 37 38" gibi akıllı bir ellipsis listesi üretiliyor — daima
// ilk sayfa, son sayfa, mevcut sayfanın komşuları gösterilir, geri kalanı
// "…" ile özetlenir.
function buildPageItems(currentPage: number, totalPages: number, siblingCount = 1): PageItem[] {
  const totalSlots = siblingCount * 2 + 5; // ilk + son + mevcut + 2*komşu + 2 tolerans

  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = Array.from({ length: 3 + siblingCount * 2 }, (_, i) => i + 1);
    return [...leftRange, ELLIPSIS, totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + siblingCount * 2;
    const rightRange = Array.from({ length: rightCount }, (_, i) => totalPages - rightCount + 1 + i);
    return [1, ELLIPSIS, ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, i) => leftSibling + i
  );
  return [1, ELLIPSIS, ...middleRange, ELLIPSIS, totalPages];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <div className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-muted transition hover:border-orange-500 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-muted"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Önceki</span>
      </button>

      {pageItems.map((item, index) =>
        item === ELLIPSIS ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center text-xs font-bold text-muted"
          >
            {ELLIPSIS}
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={currentPage === item ? "page" : undefined}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95 ${
              currentPage === item
                ? "bg-orange-500 text-white shadow-soft"
                : "border border-gray-200 text-muted hover:border-orange-500 hover:text-orange-600"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-muted transition hover:border-orange-500 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-muted"
      >
        <span className="hidden sm:inline">Sonraki</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
