"use client";

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Ref,
} from "react";
import Image from "next/image";
import { Loader2, Star, Upload, X } from "lucide-react";
import { isSupabaseUrl, resolveMediaUrl } from "@/lib/resolveMediaUrl";
import { useToastStore } from "@/store/useToastStore";
import type { VendorProductImage } from "@/lib/api/vendorProducts";

export interface ProductImagePickerHandle {
  getFiles: () => File[];
}

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface ProductImagePickerProps {
  existingImages: VendorProductImage[];
  existingImagesOwnerName: string;
  onDeleteExisting: (imageId: number) => Promise<void>;
  onSetPrimaryExisting: (imageId: number) => Promise<void>;
  /** Ürün formu kaydedilirken (ağ isteği sürerken) tüm kontrolleri kilitler. */
  isSubmitting: boolean;
}

// Bu bileşen kasıtlı olarak `memo` ile sarıldı ve seçilen dosyaları
// (`pendingFiles`) kendi iç state'inde tutuyor — üst bileşendeki state'e hiç
// yazmıyor. Kök neden: üst bileşen (ürün listesi/kategori SWR verisi arka
// planda yenilendikçe) sık sık yeniden render oluyordu ve dosya inputu o
// bileşenin DOĞRUDAN çocuğu olduğunda, bu yeniden render'lar bazen henüz
// commit edilmemiş bir `pendingFiles` güncellemesiyle çakışıp seçilen
// görselin state'e hiç yansımamasına (sessizce kaybolmasına) yol açıyordu.
// Görsel seçme state'ini üst bileşenden tamamen izole edip yalnızca ihtiyaç
// duyulan anda (form gönderiminde) `ref` üzerinden okuyarak bu sorun kökten
// çözüldü — üst bileşendeki SWR güncellemeleri artık bu bileşeni hiç
// yeniden render etmiyor (props referansları sabit kaldığı sürece).
function ProductImagePickerInner(
  {
    existingImages,
    existingImagesOwnerName,
    onDeleteExisting,
    onSetPrimaryExisting,
    isSubmitting,
  }: ProductImagePickerProps,
  ref: Ref<ProductImagePickerHandle>
) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // Bir görsel silinirken/kapak yapılırken o görselin butonlarını kilitler —
  // kullanıcının aynı butona üst üste (çift) tıklayıp aynı isteği tekrar
  // yollamasını engeller.
  const [busyImageIds, setBusyImageIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Her render'da yeni bir blob URL üretmemek için (bellek sızıntısı) sadece
  // `pendingFiles` gerçekten değiştiğinde hesaplanır; eski URL'ler temizlenir.
  const pendingFilePreviews = useMemo(
    () => pendingFiles.map((file) => URL.createObjectURL(file)),
    [pendingFiles]
  );

  useEffect(() => {
    return () => {
      pendingFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingFilePreviews]);

  useImperativeHandle(ref, () => ({ getFiles: () => pendingFiles }), [pendingFiles]);

  // Sunucuya gitmeden ÖNCE, kullanıcı dosyayı seçtiği AN format/boyut
  // kontrolü — geçersiz dosyalar toast ile reddedilip state'e hiç eklenmiyor.
  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const accepted: File[] = [];
    let rejectedCount = 0;
    let firstRejectionMessage = "";

    for (const file of Array.from(files)) {
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        rejectedCount += 1;
        firstRejectionMessage ||= `"${file.name}" desteklenmeyen bir formatta — sadece JPG, PNG veya WEBP kabul edilir.`;
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedCount += 1;
        firstRejectionMessage ||= `"${file.name}" çok büyük (${formatFileSize(file.size)}) — en fazla 5MB olmalı.`;
        continue;
      }
      accepted.push(file);
    }

    if (rejectedCount > 0) {
      const extra = rejectedCount > 1 ? ` (+${rejectedCount - 1} dosya daha reddedildi)` : "";
      useToastStore.getState().showToast("error", `${firstRejectionMessage}${extra}`);
    }
    if (accepted.length > 0) {
      setPendingFiles((prev) => [...prev, ...accepted]);
    }
    e.target.value = "";
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const runImageAction = async (imageId: number, action: (imageId: number) => Promise<void>) => {
    if (busyImageIds.has(imageId)) return;
    setBusyImageIds((prev) => new Set(prev).add(imageId));
    try {
      await action(imageId);
    } catch {
      // Hata zaten üst bileşende toast ile gösteriliyor — burada sadece
      // butonun kilidini açmak için yakalanıyor.
    } finally {
      setBusyImageIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  const handleDeleteClick = (imageId: number) => runImageAction(imageId, onDeleteExisting);
  const handleSetPrimaryClick = (imageId: number) => runImageAction(imageId, onSetPrimaryExisting);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-bold text-charcoal">Ürün Görselleri</span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImagePick}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isSubmitting}
        className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-muted transition hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload className="h-6 w-6" />
        <span className="text-xs font-bold">Görsel Yükle (birden fazla seçilebilir)</span>
      </button>

      {(existingImages.length > 0 || pendingFiles.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {existingImages.map((img) => {
            const isBusy = busyImageIds.has(img.id);
            const isDisabled = isBusy || isSubmitting;
            return (
              <div key={`existing-${img.id}`} className="relative h-16 w-16 shrink-0">
                <Image
                  src={resolveMediaUrl(img.image)}
                  alt={img.alt_text ?? existingImagesOwnerName}
                  fill
                  sizes="64px"
                  unoptimized={isSupabaseUrl(img.image)}
                  className={`rounded-lg object-cover ${img.is_primary ? "ring-2 ring-orange-500" : ""} ${
                    isBusy ? "opacity-50" : ""
                  }`}
                />
                {isBusy && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  </div>
                )}
                {!img.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimaryClick(img.id)}
                    disabled={isDisabled}
                    aria-label="Kapak görseli yap"
                    title="Kapak görseli yap"
                    className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-muted shadow-soft transition hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteClick(img.id)}
                  disabled={isDisabled}
                  aria-label="Görseli sil"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-white shadow-soft transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {pendingFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative h-16 w-16 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingFilePreviews[index]}
                alt={`Yeni görsel ${index + 1}`}
                className="h-full w-full rounded-lg object-cover opacity-70"
              />
              <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/60 py-0.5 text-center text-[9px] font-bold text-white">
                Yeni
              </span>
              <button
                type="button"
                onClick={() => handleRemovePendingFile(index)}
                disabled={isSubmitting}
                aria-label={`${index + 1}. yeni görseli kaldır`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-white shadow-soft transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ProductImagePicker = memo(forwardRef(ProductImagePickerInner));
ProductImagePicker.displayName = "ProductImagePicker";

export default ProductImagePicker;
