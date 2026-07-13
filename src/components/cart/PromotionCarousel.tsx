"use client";

import { useEffect, useRef, useState } from "react";
import { Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/product/ProductCard";
import type { PromotionSuggestion } from "@/context/CartContext";
import type { ProductCardData } from "@/lib/api/products";

type Props = {
  suggestions: PromotionSuggestion[];
  lang: string;
  /**
   * flat=true  → single carousel, all products as flat cards with promo badge (inline cart)
   * flat=false → one row per promotion with vertical cards (modal)
   */
  flat?: boolean;
};

// ─── Flat (inline cart) carousel ─────────────────────────────────────────────

type FlatItem = { product: ProductCardData; promoInfo: string };

function FlatCarousel({
  suggestions,
  lang,
  t,
}: {
  suggestions: PromotionSuggestion[];
  lang: string;
  t: (key: string) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!suggestions.length) { setItems([]); return; }
    setLoading(true);
    Promise.all(
      suggestions.map((s) => {
        const skus = [...new Set(s.targets.flatMap((tgt) => tgt.skus))];
        if (!skus.length) return Promise.resolve([] as FlatItem[]);
        return fetch(`/api/catalog/products?skus=${encodeURIComponent(skus.join(","))}`)
          .then((r) => r.json())
          .then((body) =>
            ((body.data ?? []) as ProductCardData[]).map((product) => ({
              product,
              promoInfo: s.info,
            })),
          )
          .catch(() => [] as FlatItem[]);
      }),
    )
      .then((rows) => setItems(rows.flat()))
      .finally(() => setLoading(false));
  }, [suggestions]);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-none w-[280px] h-[84px] rounded-[12px] border border-ink-100 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="relative group/carousel">
      <button
        onClick={() => scroll("left")}
        aria-label={t("promotionPrev")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-6 h-6 rounded-full bg-white border border-ink-200 shadow-sm flex items-center justify-center text-ink-600 hover:text-ink-900 transition-all opacity-0 group-hover/carousel:opacity-100"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map(({ product, promoInfo }, i) => (
          <div key={`${product.id}-${i}`} className="flex-none w-[180px]">
            <ProductCard
              product={product}
              lang={lang}
              variant="flat"
              promoInfo={promoInfo}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        aria-label={t("promotionNext")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-6 h-6 rounded-full bg-white border border-ink-200 shadow-sm flex items-center justify-center text-ink-600 hover:text-ink-900 transition-all opacity-0 group-hover/carousel:opacity-100"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Per-promo row carousel (modal) ──────────────────────────────────────────

type RowProps = {
  suggestion: PromotionSuggestion;
  products: ProductCardData[];
  lang: string;
  t: (key: string) => string;
};

function PromoRow({ suggestion, products, lang, t }: RowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });

  return (
    <div>
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success-600 bg-success-50 border border-success-200 rounded-full px-3 py-1">
          <Tag className="h-3.5 w-3.5" />
          {suggestion.info}
        </span>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-gray-400">{t("promotionModalNoProducts")}</p>
      ) : (
        <div className="relative group/carousel">
          <button
            onClick={() => scroll("left")}
            aria-label={t("promotionPrev")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-none w-[calc(100%-0.75rem)] sm:w-[calc(50%-0.375rem)] lg:w-[calc(25%-0.5625rem)]"
              >
                <ProductCard product={product} lang={lang} stackedPrice />
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            aria-label={t("promotionNext")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div>
      <div className="h-7 w-28 bg-gray-100 rounded-full animate-pulse mb-3" />
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-none w-[calc(100%-0.75rem)] sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)] rounded-xl border border-gray-100 overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function PromotionCarousel({ suggestions, lang, flat = false }: Props) {
  const t = useTranslations("cart");
  const [productsPerRow, setProductsPerRow] = useState<ProductCardData[][]>([]);
  const [loading, setLoading] = useState(false);

  // Modal mode: fetch per suggestion row
  useEffect(() => {
    if (flat) return;
    if (!suggestions.length) { setProductsPerRow([]); return; }

    setLoading(true);
    Promise.all(
      suggestions.map((s) => {
        const skus = [...new Set(s.targets.flatMap((tgt) => tgt.skus))];
        if (!skus.length) return Promise.resolve([] as ProductCardData[]);
        return fetch(`/api/catalog/products?skus=${encodeURIComponent(skus.join(","))}`)
          .then((r) => r.json())
          .then((body) => (body.data ?? []) as ProductCardData[])
          .catch(() => [] as ProductCardData[]);
      }),
    )
      .then(setProductsPerRow)
      .finally(() => setLoading(false));
  }, [suggestions, flat]);

  if (flat) {
    return <FlatCarousel suggestions={suggestions} lang={lang} t={t} />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {suggestions.map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {suggestions.map((suggestion, i) => (
        <PromoRow
          key={suggestion.promotion_id}
          suggestion={suggestion}
          products={productsPerRow[i] ?? []}
          lang={lang}
          t={t}
        />
      ))}
    </div>
  );
}
