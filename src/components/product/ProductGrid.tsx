"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, LayoutList } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductCard } from "./ProductCard";
import {
  readViewModeCookie,
  writeViewModeCookie,
} from "@/lib/view-mode-cookie";
import type { ProductCardData } from "@/lib/api/products";

const VIEW_MODE_COOKIE = "product_view_mode";

type ProductGridProps = {
  products: ProductCardData[];
  lang: string;
};

export function ProductGrid({ products, lang }: ProductGridProps) {
  const t = useTranslations("search");
  const [viewMode, setViewModeState] = useState<"list" | "grid">("list");

  // Sync from cookie after hydration — matches B2BCartContent's view-mode pattern.
  useEffect(() => {
    setViewModeState(readViewModeCookie(VIEW_MODE_COOKIE, "list"));
  }, []);

  const setViewMode = useCallback((mode: "list" | "grid") => {
    writeViewModeCookie(VIEW_MODE_COOKIE, mode);
    setViewModeState(mode);
  }, []);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 text-sm">{t("noResults")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-[3px] bg-ink-100 rounded-[8px] p-[3px]">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            title={t("viewList")}
            aria-pressed={viewMode === "list"}
            className={[
              "w-8 h-7 rounded-[6px] flex items-center justify-center transition-colors",
              viewMode === "list"
                ? "bg-white shadow-sm text-ink-900"
                : "text-ink-600 hover:text-ink-900",
            ].join(" ")}
          >
            <LayoutList size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title={t("viewGrid")}
            aria-pressed={viewMode === "grid"}
            className={[
              "w-8 h-7 rounded-[6px] flex items-center justify-center transition-colors",
              viewMode === "grid"
                ? "bg-white shadow-sm text-ink-900"
                : "text-ink-600 hover:text-ink-900",
            ].join(" ")}
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {products.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              priority={i < 4}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              priority={i < 4}
              variant="row"
            />
          ))}
        </div>
      )}
    </div>
  );
}
