import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import CartDrawer from "@/components/CartDrawer";
import AuthModal from "@/components/AuthModal";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import BrandingBootstrap from "@/components/branding/BrandingBootstrap";
import ToastHost from "@/components/ui/ToastHost";
import DevRoleSwitcher from "@/components/dev/DevRoleSwitcher";
import SWRProvider from "@/components/SWRProvider";
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

export const metadata: Metadata = {
  title: "Sepetim Kapımda | Hızlı Teslimat, Taze Ürünler",
  description:
    "Sepetim Kapımda ile taze meyve sebzeden temizlik ürünlerine, dakikalar içinde kapınızda.",
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
