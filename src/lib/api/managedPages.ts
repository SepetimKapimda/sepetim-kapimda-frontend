import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse } from "@/lib/pagination";
import { fetchPageBySlug } from "@/lib/api/pages";

// Admin Paneli → Site İçeriği & Sözleşmeler ekranından yönetilen sekiz sabit
// sayfa (6 yasal metin + Hakkımızda + İletişim). Backend'de bunlar `/api/pages/`
// (public, salt okunur) ile aynı "DynamicPage" kaydı — admin tarafı
// `/api/admin/pages/{slug}/` üzerinden yazar.
export const MANAGED_PAGE_SLUGS = [
  "mesafeli-satis-sozlesmesi",
  "uyelik-sozlesmesi",
  "kvkk-aydinlatma-metni",
  "cerez-politikasi",
  "on-bilgilendirme-formu",
  "acik-riza-beyani",
  "hakkimizda",
  "iletisim",
] as const;

export type ManagedPageSlug = (typeof MANAGED_PAGE_SLUGS)[number];

export function isManagedPageSlug(slug: string): slug is ManagedPageSlug {
  return (MANAGED_PAGE_SLUGS as readonly string[]).includes(slug);
}

// Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu sipariş anında şablon
// değişkenleriyle dinamik doldurulduğu için PDF olarak yayınlanamaz (hukuki
// kısıtlama) — backend de bu iki slug için `content_type: "pdf"` yazma
// isteğini reddeder. Diğer altı sayfa (Hakkımızda ve İletişim dahil) PDF
// olarak da yayınlanabilir.
export const PDF_DISALLOWED_SLUGS: readonly ManagedPageSlug[] = [
  "mesafeli-satis-sozlesmesi",
  "on-bilgilendirme-formu",
];

export type ManagedPageContentType = "html" | "pdf";

export interface ManagedPagePlaceholder {
  name: string;
  description: string;
}

export interface ManagedPageContent {
  slug: ManagedPageSlug;
  title: string;
  content_type: ManagedPageContentType;
  content_html: string | null;
  pdf_url: string | null;
  pdf_file_name: string | null;
  /** Yalnızca ÖBF/MSS gibi şablonla doldurulan sayfalarda dolu gelir. */
  available_placeholders: ManagedPagePlaceholder[];
  /** Hiç kaydedilmemiş sayfada backend `null` döner. */
  updated_at: string | null;
}

export const MANAGED_PAGE_TITLES: Record<ManagedPageSlug, string> = {
  "mesafeli-satis-sozlesmesi": "Mesafeli Satış Sözleşmesi",
  "uyelik-sozlesmesi": "Üyelik Sözleşmesi",
  "kvkk-aydinlatma-metni": "KVKK Aydınlatma Metni",
  "cerez-politikasi": "Çerez Politikası",
  "on-bilgilendirme-formu": "Ön Bilgilendirme Formu",
  "acik-riza-beyani": "Açık Rıza Beyanı",
  hakkimizda: "Hakkımızda",
  iletisim: "İletişim",
};

// Admin paneli: sekiz sayfanın da güncel halini `/api/admin/pages/` üzerinden
// döner. Yanıt sayfalıdır (`results`); bu uç muhtemelen tüm dinamik sayfaları
// listelediği için yalnızca bilinen 8 slug'a filtrelenir. Backend'de henüz
// kaydı oluşturulmamış bir slug varsa kartı boş bir taslakla gösterir —
// "Kaydet" o zaman ilk kaydı oluşturur.
export async function fetchManagedPagesAdmin(): Promise<ManagedPageContent[]> {
  const data = await apiClient.get<PaginatedResponse<ManagedPageContent>>(
    "/api/admin/pages/?page_size=100"
  );
  const bySlug = new Map(data.results.map((page) => [page.slug, page]));
  return MANAGED_PAGE_SLUGS.map(
    (slug) =>
      bySlug.get(slug) ?? {
        slug,
        title: MANAGED_PAGE_TITLES[slug],
        content_type: "html",
        content_html: "",
        pdf_url: null,
        pdf_file_name: null,
        available_placeholders: [],
        updated_at: null,
      }
  );
}

// Müşteri tarafı (`/sayfa/[slug]`): public `/api/pages/{slug}/` ucu diğer tüm
// kurumsal sayfalarla aynı — admin tarafından yazılan `content_type`/`pdf_url`
// da aynı kayıttan gelir.
export async function fetchManagedPagePublic(slug: ManagedPageSlug): Promise<ManagedPageContent> {
  const data = await fetchPageBySlug(slug);
  return {
    slug,
    title: data.title,
    content_type: data.content_type ?? "html",
    content_html: data.content_html,
    pdf_url: data.pdf_url ?? null,
    // Bu iki alan yalnızca admin uçlarında (`AdminLegalPage`) döner; public
    // `/api/pages/{slug}/` (`DynamicPageDetail`) içermez — müşteri sayfası
    // zaten bunları kullanmaz.
    pdf_file_name: null,
    available_placeholders: [],
    updated_at: data.updated_at,
  };
}

export function saveManagedPageHtml(
  slug: ManagedPageSlug,
  html: string
): Promise<ManagedPageContent> {
  const formData = new FormData();
  formData.append("content_type", "html");
  formData.append("content_html", html);
  return apiClient.patch<ManagedPageContent>(`/api/admin/pages/${slug}/`, formData);
}

export function saveManagedPagePdf(
  slug: ManagedPageSlug,
  file: File
): Promise<ManagedPageContent> {
  const formData = new FormData();
  formData.append("content_type", "pdf");
  formData.append("pdf_file", file);
  return apiClient.patch<ManagedPageContent>(`/api/admin/pages/${slug}/`, formData);
}
