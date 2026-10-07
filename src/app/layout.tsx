import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import CartDrawer from "@/components/CartDrawer";
import AuthModal from "@/components/AuthModal";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import BrandingBootstrap from "@/components/branding/BrandingBootstrap";
import ToastHost from "@/components/ui/ToastHost";
import DevRoleSwitcher from "@/components/dev/DevRoleSwitcher";
import SWRProvider from "@/components/SWRProvider";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const DESCRIPTION =
  "Sakarya Akyazı'da yerel sanal market: taze meyve-sebzeden temizlik ürünlerine kadar binlerce ürün, 10-30 dakikada kapınızda. Hemen sipariş verin, Sepetim Kapımda ile vakit kaybetmeyin.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Akyazı'ya Hızlı Market Teslimatı`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "sepetim kapımda",
    "akyazı market",
    "akyazı online market",
    "sakarya online market",
    "hızlı market teslimatı",
    "online market siparişi",
    "aynı gün teslimat",
    "akyazı sanal market",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Akyazı'ya Hızlı Market Teslimatı`,
    description: DESCRIPTION,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Akyazı'ya Hızlı Market Teslimatı`,
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${poppins.variable} ${inter.variable} overflow-x-hidden font-sans antialiased bg-offwhite text-charcoal`}
      >
        <SWRProvider>
          {children}
          <AuthBootstrap />
          <BrandingBootstrap />
          <CartDrawer />
          <AuthModal />
          <ToastHost />
          <DevRoleSwitcher />
        </SWRProvider>
      </body>
    </html>
  );
}
