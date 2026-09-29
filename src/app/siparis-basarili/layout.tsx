import Link from "next/link";
import Logo from "@/components/Logo";

export default function OrderSuccessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen w-full">
      <header className="w-full border-b border-gray-100 bg-white shadow-soft">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Logo className="h-10 w-auto md:h-12" />
          </Link>
        </div>
      </header>

      {children}
    </div>
  );
}
