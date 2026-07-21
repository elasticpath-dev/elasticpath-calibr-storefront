"use client";

import { useEffect, useRef } from "react";
import {
  useHits,
  useInfiniteHits,
  useInstantSearch,
  usePagination,
} from "react-instantsearch";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import type { ProductCardData } from "@/lib/api/products";

type HitToCard = (hit: Record<string, unknown>) => ProductCardData;

/**
 * Standard paginated results: current page's hits + a pager. Owns the
 * useHits/usePagination connectors so they're only active in this mode.
 */
export function PaginatedResults({
  lang,
  hitToCard,
}: {
  lang: string;
  hitToCard: HitToCard;
}) {
  const { hits } = useHits<Record<string, unknown>>();
  const { currentRefinement, nbPages, refine: goToPage } = usePagination();

  return (
    <>
      <ProductGrid products={hits.map(hitToCard)} lang={lang} />
      {nbPages > 1 && (
        <div className="mt-10 flex justify-center">
          <Pagination
            currentPage={currentRefinement + 1}
            totalPages={nbPages}
            onPageChange={(page) => goToPage(page - 1)}
          />
        </div>
      )}
    </>
  );
}

/**
 * Infinite-scroll results: accumulates every loaded page and auto-loads the
 * next one as a sentinel near the bottom scrolls into view, until the last
 * page. Uses the useInfiniteHits connector (no pagination widget).
 */
export function InfiniteResults({
  lang,
  hitToCard,
}: {
  lang: string;
  hitToCard: HitToCard;
}) {
  const { items, isLastPage, showMore } =
    useInfiniteHits<Record<string, unknown>>();
  const { status } = useInstantSearch();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Keep the latest values in refs so the observer effect doesn't depend on
  // their identity — `showMore` is a new function each render, and re-creating
  // the observer on an already-visible sentinel re-fires it, causing an endless
  // showMore loop (constant refreshing).
  const showMoreRef = useRef(showMore);
  showMoreRef.current = showMore;
  const isLastPageRef = useRef(isLastPage);
  isLastPageRef.current = isLastPage;
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Guard: only load the next page when idle — never while a search is
        // already in flight (prevents any re-fire loop).
        if (
          entries[0]?.isIntersecting &&
          !isLastPageRef.current &&
          statusRef.current === "idle"
        ) {
          showMoreRef.current();
        }
      },
      // Start loading before the sentinel is fully visible for a smoother feel.
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // Re-attach only when the sentinel itself mounts/unmounts (isLastPage flips).
  }, [isLastPage]);

  return (
    <>
      <ProductGrid products={items.map(hitToCard)} lang={lang} />
      {!isLastPage && (
        <div
          ref={sentinelRef}
          className="mt-8 flex justify-center py-4"
          aria-hidden="true"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-primary" />
        </div>
      )}
    </>
  );
}
