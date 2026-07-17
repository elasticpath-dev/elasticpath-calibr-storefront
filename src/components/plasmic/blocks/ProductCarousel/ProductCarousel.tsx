"use client";

import { useEffect, useState } from "react";
import { ProductCarouselDisplay } from "@/components/product/ProductCarouselDisplay";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import type { ProductCardData } from "@/lib/api/products";

export type SelectedProduct = { id: string; name: string };

// Plasmic renders separate DOM trees per responsive breakpoint (toggled via
// CSS, not JS), so one carousel placed in Studio can mount several identical
// ProductCarousel instances at once — each with the same url. Dedupe by url
// so they share a single in-flight request instead of firing one each.
const inFlightRequests = new Map<string, Promise<ProductCardData[]>>();

async function fetchCarouselProducts(url: string): Promise<ProductCardData[]> {
  const cached = inFlightRequests.get(url);
  if (cached) return cached;

  const request = fetch(url)
    .then((res) => res.json())
    .then((json) => (json.data ?? []) as ProductCardData[])
    .catch(() => [])
    .finally(() => {
      inFlightRequests.delete(url);
    });

  inFlightRequests.set(url, request);
  return request;
}

export type ProductCarouselProps = {
  selectionMode?: "products" | "node";
  products?: SelectedProduct[];
  nodeId?: string;
  lang?: string;
  title?: string;
  slidesToShow?: number;
  autoplay?: boolean;
  autoplayInterval?: number;
  showDots?: boolean;
  infinite?: boolean;
  className?: string;
};

export function ProductCarousel({
  selectionMode = "products",
  products: selectedProducts = [],
  nodeId = "",
  lang = "en",
  title,
  slidesToShow = 4,
  autoplay = false,
  autoplayInterval = 3000,
  showDots = false,
  infinite = false,
  className,
}: ProductCarouselProps) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(false);

  const productIdsKey = selectedProducts.map((p) => p.id).join(",");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let url = "";
        if (selectionMode === "node" && nodeId?.trim()) {
          url = `/api/catalog/products?nodeId=${encodeURIComponent(nodeId)}`;
        } else if (selectionMode === "products" && productIdsKey) {
          url = `/api/catalog/products?ids=${encodeURIComponent(productIdsKey)}`;
        } else {
          setProducts([]);
          return;
        }
        setProducts(await fetchCarouselProducts(url));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectionMode, productIdsKey, nodeId]);

  const wrapperClass = className ?? "container-shell px-4 sm:px-8 py-8";

  if (loading) {
    return (
      <div className={wrapperClass}>
        {title && <Skeleton className="h-7 w-48 mb-6" />}
        <div className="flex gap-4">
          {Array.from({ length: slidesToShow }).map((_, i) => (
            <div
              key={i}
              style={{ flex: `0 0 calc(${100 / slidesToShow}% - 12px)` }}
            >
              <Skeleton className="h-72 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className={wrapperClass}>
      {title && (
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h2>
      )}
      <ProductCarouselDisplay
        products={products}
        lang={lang}
        slidesToShow={slidesToShow}
        autoplay={autoplay}
        autoplayInterval={autoplayInterval}
        showDots={showDots}
        infinite={infinite}
      />
    </div>
  );
}
