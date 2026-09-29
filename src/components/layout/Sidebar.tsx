"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { ChevronRight, LucideIcon, Loader2, Menu, X } from "lucide-react";
import { fetchCategories, type CategoryListItem } from "@/lib/api/categories";
import { useUIStore } from "@/store/useUIStore";
import SidebarPromoCard from "./SidebarPromoCard";

function CategoryList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center px-4 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-1 px-2">
      {categories.map((category) => {
        const href = `/kategoriler/${category.slug}`;
        const isActive = pathname === href;
        const Icon = (Icons[category.icon as keyof typeof Icons] ??
          Icons.ShoppingBasket) as LucideIcon;

        return (
          <Link
            key={category.id}
            href={href}
            onClick={onNavigate}
            className={`group flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 text-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-gray-800 hover:bg-offwhite hover:text-primary"
            }`}
          >
            <span className="flex items-center gap-4">
              <Icon
                className={`h-7 w-7 shrink-0 ${
                  isActive ? "text-primary" : "text-muted group-hover:text-primary"
                }`}
              />
              {category.name}
            </span>
            <ChevronRight
              className={`h-5 w-5 shrink-0 opacity-0 transition group-hover:opacity-100 ${
                isActive ? "opacity-100 text-primary" : "text-muted"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const isMobileMenuOpen = useUIStore((state) => state.isMobileMenuOpen);
  const closeMobileMenu = useUIStore((state) => state.closeMobileMenu);
  const pathname = usePathname();

  // Close the drawer whenever the route changes and lock body scroll while open.
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", isMobileMenuOpen);
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden min-h-[calc(100vh-4rem)] w-72 shrink-0 border-r border-gray-100 bg-white md:block">
        <div className="flex w-full items-center gap-2 rounded-none bg-primary px-5 py-4 text-white shadow-soft">
          <Menu className="h-5 w-5" />
          <span className="font-heading text-sm font-bold uppercase tracking-wide">
            Tüm Kategoriler
          </span>
        </div>
        <div className="py-4 scrollbar-thin">
          <CategoryList />
          <SidebarPromoCard />
        </div>
      </aside>

      {/* Mobile off-canvas drawer */}
      <div
        className={`fixed inset-0 z-[60] md:hidden ${
          isMobileMenuOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div
          onClick={closeMobileMenu}
          className={`absolute inset-0 bg-charcoal/40 transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col bg-white shadow-popover transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted">
              Kategoriler
            </h2>
            <button
              type="button"
              onClick={closeMobileMenu}
              aria-label="Menüyü kapat"
              className="flex items-center justify-center rounded-lg p-1.5 text-charcoal transition hover:bg-offwhite hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.95]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-3 scrollbar-thin">
            <CategoryList onNavigate={closeMobileMenu} />
          </div>
        </aside>
      </div>
    </>
  );
}
