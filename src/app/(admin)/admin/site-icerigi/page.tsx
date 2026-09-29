"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Type,
  Upload,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import {
  PDF_DISALLOWED_SLUGS,
  fetchManagedPagesAdmin,
  saveManagedPageHtml,
  saveManagedPagePdf,
  type ManagedPageContent,
  type ManagedPageContentType,
  type ManagedPageSlug,
} from "@/lib/api/managedPages";

type ToastState = { type: "success" | "error"; message: string } | null;

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminSiteIcerigiPage() {
  const [pages, setPages] = useState<ManagedPageContent[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Kartın hangi modda (Metin/PDF) gösterileceği — sadece Kaydet/Yükle
  // basılınca gerçek `content_type` değişir, bu yüzden ayrı bir görünüm state'i.
  const [viewModes, setViewModes] = useState<Record<string, ManagedPageContentType>>({});
  const [savingSlug, setSavingSlug] = useState<ManagedPageSlug | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const fileInputRefs = useRef<Partial<Record<ManagedPageSlug, HTMLInputElement | null>>>({});
  const toastTimeoutRef = useRef<number | null>(null);

  // 8 karttan herhangi ikisi arka arkaya kaydedilirse önceki toast'un
  // zamanlayıcısı, henüz 2.5 sn'sini doldurmamış YENİ toast'u silebiliyordu
  // (her çağrı kendi bağımsız setTimeout'unu kuruyordu) — bu yüzden yeni bir
  // toast gösterilmeden önce bekleyen zamanlayıcı iptal edilir.
  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    fetchManagedPagesAdmin().then((data) => {
      setPages(data);
      setDrafts(Object.fromEntries(data.map((p) => [p.slug, p.content_html ?? ""])));
      setViewModes(Object.fromEntries(data.map((p) => [p.slug, p.content_type])));
    });
  }, []);

  const updatePageInState = (updated: ManagedPageContent) => {
    setPages((prev) => prev && prev.map((p) => (p.slug === updated.slug ? updated : p)));
  };

  const handleSaveHtml = async (slug: ManagedPageSlug) => {
    setSavingSlug(slug);
    try {
      const updated = await saveManagedPageHtml(slug, drafts[slug] ?? "");
      updatePageInState(updated);
      showToast("success", `"${updated.title}" güncellendi.`);
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Kaydedilemedi.");
    } finally {
      setSavingSlug(null);
    }
  };

  const handleSavePdf = async (slug: ManagedPageSlug, file: File) => {
    setSavingSlug(slug);
    try {
      const updated = await saveManagedPagePdf(slug, file);
      updatePageInState(updated);
      setViewModes((prev) => ({ ...prev, [slug]: "pdf" }));
      showToast("success", `"${updated.title}" için PDF yayınlandı.`);
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "PDF yüklenemedi.");
    } finally {
      setSavingSlug(null);
    }
  };

  const handlePickPdf = (slug: ManagedPageSlug, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      showToast("error", "Yalnızca PDF dosyaları yüklenebilir.");
      return;
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      showToast("error", `PDF dosyası ${formatSize(MAX_PDF_SIZE_BYTES)}'ı geçemez.`);
      return;
    }
    void handleSavePdf(slug, file);
  };

  if (!pages) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

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

      <h1 className="mb-1 font-heading text-2xl font-black text-gray-900">
        Site İçeriği &amp; Sözleşmeler
      </h1>
      <p className="mb-6 text-sm text-muted">
        Yasal metinleri ve kurumsal sayfaları (Hakkımızda, İletişim) buradan düzenleyebilir veya
        (uygun olanlarda) doğrudan bir PDF dosyası olarak yayınlayabilirsiniz.
      </p>

      <div className="space-y-5">
        {pages.map((page) => {
          const isSaving = savingSlug === page.slug;
          const canBePdf = !PDF_DISALLOWED_SLUGS.includes(page.slug);
          const viewMode = canBePdf ? viewModes[page.slug] ?? page.content_type : "html";

          return (
            <div
              key={page.slug}
              data-testid={`managed-page-card-${page.slug}`}
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-base font-bold text-charcoal">{page.title}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Son güncelleme:{" "}
                    {page.updated_at ? new Date(page.updated_at).toLocaleString("tr-TR") : "Henüz kaydedilmedi"}
                    {" · "}
                    {page.content_type === "pdf" ? "PDF" : "Metin (HTML)"}
                  </p>
                </div>
                <Link
                  href={`/sayfa/${page.slug}`}
                  target="_blank"
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-muted transition hover:border-orange-500 hover:text-orange-600"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Görüntüle
                </Link>
              </div>

              <div className="mb-4 flex items-center gap-1.5 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewModes((prev) => ({ ...prev, [page.slug]: "html" }))}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                    viewMode === "html"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-muted hover:text-charcoal"
                  }`}
                >
                  <Type className="h-3.5 w-3.5" />
                  Metin (HTML)
                </button>
                {canBePdf && (
                  <button
                    type="button"
                    onClick={() => setViewModes((prev) => ({ ...prev, [page.slug]: "pdf" }))}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                      viewMode === "pdf"
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-muted hover:text-charcoal"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF Dosyası
                  </button>
                )}
              </div>
              {!canBePdf && (
                <div className="mb-4 -mt-2 rounded-lg bg-gray-50 p-3 text-xs text-muted">
                  <p>Bu belge sipariş anında dinamik olarak doldurulduğu için PDF olarak yayınlanamaz.</p>
                  {page.available_placeholders.length > 0 && (
                    <p className="mt-1.5">
                      Metinde yalnızca şu değişkenler kullanılabilir:{" "}
                      {page.available_placeholders.map((p, i) => (
                        <span key={p.name}>
                          <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-charcoal" title={p.description}>
                            {`{{ ${p.name} }}`}
                          </code>
                          {i < page.available_placeholders.length - 1 ? " " : ""}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              )}

              {viewMode === "html" ? (
                <div>
                  <textarea
                    id={`managed-page-html-${page.slug}`}
                    rows={6}
                    value={drafts[page.slug] ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [page.slug]: e.target.value }))
                    }
                    placeholder="<p>Sözleşme metnini buraya yazın (temel HTML etiketleri desteklenir: h2, p, ul, li, a, strong)</p>"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-xs text-charcoal transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveHtml(page.slug)}
                    disabled={isSaving}
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Kaydet
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[page.slug] = el;
                    }}
                    id={`managed-page-pdf-input-${page.slug}`}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handlePickPdf(page.slug, e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => fileInputRefs.current[page.slug]?.click()}
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-muted transition hover:border-orange-500 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                    <span className="text-xs font-bold">
                      {page.content_type === "pdf" && page.pdf_file_name
                        ? `Değiştir: ${page.pdf_file_name}`
                        : `PDF Yükle (maks. ${formatSize(MAX_PDF_SIZE_BYTES)})`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
