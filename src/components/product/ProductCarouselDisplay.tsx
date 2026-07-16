"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { ProductCardData } from "@/lib/api/products";

export type ProductCarouselDisplayProps = {
  products: ProductCardData[];
  lang: string;
  slidesToShow?: number;
  autoplay?: boolean;
  autoplayInterval?: number;
  showDots?: boolean;
  infinite?: boolean;
};

export function ProductCarouselDisplay({
  products,
  lang,
  slidesToShow = 4,
  autoplay = true,
  autoplayInterval = 3000,
  showDots = true,
  infinite = true,
}: ProductCarouselDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getCardWidth = useCallback(() => {
    const el = scrollRef.current;
    return el && products.length ? el.scrollWidth / products.length : 0;
  }, [products.length]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ left: index * getCardWidth(), behavior: "smooth" });
    },
    [getCardWidth],
  );

  const scrollByDir = useCallback(
    (dir: "prev" | "next") => {
      const el = scrollRef.current;
      if (!el || !products.length) return;
      const w = getCardWidth();
      const maxScroll = el.scrollWidth - el.clientWidth;

      if (dir === "next") {
        if (infinite && el.scrollLeft >= maxScroll - 1) {
          el.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          el.scrollBy({ left: w, behavior: "smooth" });
        }
      } else {
        if (infinite && el.scrollLeft <= 1) {
          el.scrollTo({ left: maxScroll, behavior: "smooth" });
        } else {
          el.scrollBy({ left: -w, behavior: "smooth" });
        }
      }
    },
    [products.length, infinite, getCardWidth],
  );

  // Track active card index on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const w = el.scrollWidth / products.length;
      if (w > 0) setActiveIndex(Math.round(el.scrollLeft / w));
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [products.length]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || !products.length) return;
    const timer = setInterval(() => scrollByDir("next"), autoplayInterval);
    return () => clearInterval(timer);
  }, [autoplay, autoplayInterval, scrollByDir, products.length]);

  if (!products.length) return null;

  const totalDots = Math.ceil(products.length / slidesToShow);
  const activeDot = Math.min(
    Math.floor(activeIndex / slidesToShow),
    totalDots - 1,
  );

  return (
    <div>
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByDir("prev")}
          aria-label="Previous"
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              style={{
                flex: `0 0 calc(${100 / slidesToShow}% - 12px)`,
                minWidth: 220,
                scrollSnapAlign: "start",
              }}
            >
              <ProductCard
                product={product}
                lang={lang}
                priority={index < slidesToShow}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollByDir("next")}
          aria-label="Next"
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {showDots && totalDots > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          {Array.from({ length: totalDots }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i * slidesToShow)}
              aria-label={`Go to page ${i + 1}`}
              className="group flex items-center justify-center h-6 w-6 -mx-2"
            >
              <span
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeDot
                    ? "w-6 bg-brand-primary"
                    : "w-2 bg-gray-300 group-hover:bg-gray-400"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
