"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileQuestion, FileText, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { fetchPageBySlug } from "@/lib/api/pages";
import { fetchManagedPagePublic, isManagedPageSlug } from "@/lib/api/managedPages";

interface ResolvedPage {
  title: string;
  updated_at: string | null;
  contentType: "html" | "pdf";
  html: string | null;
  pdfUrl: string | null;
}

export default function DynamicContentPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [page, setPage] = useState<ResolvedPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);

    // Sekiz yönetilen sayfa (6 yasal metin + Hakkımızda + İletişim) artık Admin
    // Paneli → Site İçeriği & Sözleşmeler ekranından yönetiliyor (bkz.
    // `managedPages.ts`); bu sekiz slug'ın dışındaki herhangi bir kurumsal
    // sayfa hâlâ doğrudan Django Admin'den (`/api/pages/`) gelir.
    const request = isManagedPageSlug(slug)
      ? fetchManagedPagePublic(slug).then((data) =>
          setPage({
            title: data.title,
            updated_at: data.updated_at,
            contentType: data.content_type,
            html: data.content_html,
            pdfUrl: data.pdf_url,
          })
        )
      : fetchPageBySlug(slug).then((data) =>
          setPage({
            title: data.title,
            updated_at: data.updated_at,
            contentType: data.content_type ?? "html",
            html: data.content_html,
            pdfUrl: data.pdf_url ?? null,
          })
        );

    request
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-soft">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-24 text-center shadow-soft">
        <FileQuestion className="h-10 w-10 text-muted" />
        <h1 className="font-heading text-xl font-bold text-charcoal">Sayfa bulunamadı</h1>
        <p className="text-sm text-muted">Aradığınız içerik kaldırılmış veya taşınmış olabilir.</p>
        <Link href="/" className="mt-2 text-sm font-bold text-primary hover:underline">
          Anasayfaya dön
        </Link>
      </div>
    );
  }

  return (
    <article className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-soft sm:p-8">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-muted">
        <Link href="/" className="transition hover:text-primary">
          Anasayfa
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold text-charcoal">{page.title}</span>
      </nav>

      <header className="mb-8 border-b border-gray-100 pb-6">
        <h1 className="font-heading text-3xl font-black text-gray-900 sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-2 text-xs text-muted">
          Son güncelleme:{" "}
          {page.updated_at
            ? new Date(page.updated_at).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </p>
      </header>

      {page.contentType === "pdf" && page.pdfUrl ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-offwhite p-4 text-sm text-muted">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            Bu belge PDF olarak yayınlanmıştır.
            <a
              href={page.pdfUrl}
              download={`${page.title}.pdf`}
              className="ml-auto font-bold text-primary hover:underline"
            >
              İndir
            </a>
          </div>
          <iframe
            src={page.pdfUrl}
            title={page.title}
            className="h-[75vh] w-full rounded-xl border border-gray-100"
          />
        </div>
      ) : (
        <div
          // Tailwind Typography eklentisi kurulu değil; CMS'ten (Django Admin veya
          // Admin Paneli → Site İçeriği & Sözleşmeler) gelen serbest biçimli HTML'i
          // (h2/p/ul/a vb.) elle hedefleyen alt seçicilerle biçimlendiriyoruz.
          className="flex flex-col gap-5 text-base leading-relaxed text-charcoal sm:text-[17px]
          [&_h2]:mt-2 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900
          [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gray-900
          [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:leading-relaxed
          [&_a]:font-semibold [&_a]:text-primary [&_a]:underline
          [&_strong]:font-bold"
          // Sadece adminlerin erişebildiği bir alandır, kullanıcı girdisi değildir.
          dangerouslySetInnerHTML={{ __html: page.html ?? "" }}
        />
      )}
    </article>
  );
}
