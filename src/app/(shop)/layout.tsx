import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import HomeBottomBannerSlot from "@/components/home/HomeBottomBannerSlot";
import CookieBanner from "@/components/ui/CookieBanner";

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <div className="flex w-full max-w-[1536px] mx-auto px-4 lg:px-8">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
      <HomeBottomBannerSlot />
      <CookieBanner />
    </>
  );
}
