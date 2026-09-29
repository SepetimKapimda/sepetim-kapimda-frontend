import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CorporateNav from "@/components/layout/CorporateNav";

// Kurumsal/hukuki sayfalar (Hakkımızda, SSS, İletişim, KVKK, sözleşmeler)
// bilinçli olarak `(shop)` route group'unun DIŞINDA tutulur — bu sayede ana
// e-ticaret layout'unun ürün kategorileri Sidebar'ını miras almazlar, kendi
// sade kurumsal navigasyonlarını kullanırlar. Navbar ve Footer marka
// bütünlüğü için korunur.
export default function KurumsalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-10 lg:px-8 lg:py-10">
        <CorporateNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </>
  );
}
