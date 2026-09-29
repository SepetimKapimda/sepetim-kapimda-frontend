import Link from "next/link";
import { Lock } from "lucide-react";
import Logo from "@/components/Logo";

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white shadow-soft">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Logo className="h-10 w-auto md:h-12" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-muted">
            <Lock className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Güvenli Ödeme</span>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
