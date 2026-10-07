import type { MetadataRoute } from "next";
import { fetchCategories } from "@/lib/api/categories";
import { fetchProducts } from "@/lib/api/products";
import { fetchPages } from "@/lib/api/pages";
import { SITE_URL } from "@/lib/seo";

const PRODUCTS_PAGE_SIZE = 100;
// Katalog beklenenden büyükse (veya backend hatalı bir `count` dönerse)
// sitemap üretiminin sonsuz sayfalamaya girmemesi için güvenlik freni.
const MAX_PRODUCT_PAGES = 100;

async function fetchAllProductSlugs(): Promise<string[]> {
  try {
    const slugs: string[] = [];
    let page = 1;
    while (page <= MAX_PRODUCT_PAGES) {
      const { count, products } = await fetchProducts({ page, pageSize: PRODUCTS_PAGE_SIZE });
      slugs.push(...products.map((product) => product.slug));
      if (page * PRODUCTS_PAGE_SIZE >= count) break;
      page += 1;
    }
    return slugs;
  } catch {
    // Backend geçici olarak erişilemezse sitemap'in tamamı değil, sadece
    // ürün bölümü boş kalsın — statik rotalar yine de yayınlanmalı.
    return [];
  }
}

async function fetchAllCategorySlugs(): Promise<string[]> {
  try {
    const categories = await fetchCategories();
    return categories.map((category) => category.slug);
  } catch {
    return [];
  }
}

// İletişim, Hakkımızda, KVKK, Mesafeli Satış vb. kurumsal sayfalar bu
// projede frontend'de statik değil, backend CMS'inden (`/api/pages/`)
// yönetiliyor ve `/sayfa/{slug}` altında yayınlanıyor — bu yüzden ayrı bir
// "iletişim" statik rotası yok, hepsi bu dinamik listeden gelir.
async function fetchAllCmsPages(): Promise<{ slug: string; updatedAt: Date }[]> {
  try {
    const pages = await fetchPages();
    return pages.map((page) => ({ slug: page.slug, updatedAt: new Date(page.updated_at) }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productSlugs, categorySlugs, cmsPages] = await Promise.all([
    fetchAllProductSlugs(),
    fetchAllCategorySlugs(),
    fetchAllCmsPages(),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${SITE_URL}/kategoriler/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${SITE_URL}/urun/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const cmsRoutes: MetadataRoute.Sitemap = cmsPages.map(({ slug, updatedAt }) => ({
    url: `${SITE_URL}/sayfa/${slug}`,
    lastModified: updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...cmsRoutes];
}
