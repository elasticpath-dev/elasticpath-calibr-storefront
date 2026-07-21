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
import { useAuth } from "@/context/AuthContext";
import type { ProductCardData } from "@/lib/api/products";

type HitToCard = (hit: Record<string, unknown>) => ProductCardData;

/**
 * Runs `onChange` when the shopper switches from one account to another (not on
 * initial hydration "" → id, nor logout id → ""). Used to re-fetch results
 * because prices are account-specific. `onChange` is kept in a ref and the
 * effect depends only on the account id, so the router.refresh() that
 * selectAccount() triggers can't re-run it.
 */
function useAccountChange(onChange: () => void) {
  const { credentials } = useAuth();
  const account = credentials?.selected ?? "";
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const prev = useRef(account);
  useEffect(() => {
    const p = prev.current;
    if (p === account) return;
    prev.current = account;
    if (p && account) cbRef.current();
  }, [account]);
}

/**
 * Resettable version of react-instantsearch's in-memory infinite-hits cache.
 * The default one only writes a page when it's not already cached, so after an
 * account switch a refetch of page 0 never overwrites the stale (old-account)
 * prices. reset() drops the cached pages so refresh() repopulates them with the
 * new account's results.
 */
function createResettableInfiniteHitsCache() {
  let cachedHits: any = null;
  let cachedKey: string | null = null;
  const keyOf = (state: any) => {
    const { page: _page, ...rest } = state ?? {};
    return JSON.stringify(rest);
  };
  return {
    read({ state }: { state: any }) {
      return cachedKey !== null && cachedKey === keyOf(state) ? cachedHits : null;
    },
    write({ state, hits }: { state: any; hits: any }) {
      cachedKey = keyOf(state);
      cachedHits = hits;
    },
    reset() {
      cachedHits = null;
      cachedKey = null;
    },
  };
}

/**
 * Loader shown while a result set is being (re)fetched — e.g. during an
 * account switch, when the accumulated hits are momentarily empty. Prevents
 * ProductGrid's "no products" empty state from flashing before the response
 * arrives.
 */
function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse"
        >
          <div className="aspect-square bg-gray-100" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-4 bg-gray-100 rounded w-1/4 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const { refresh } = useInstantSearch();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  // useHits has no accumulation cache, so clearing the helper cache via
  // refresh() is enough to re-fetch the new account's prices.
  useAccountChange(() => refreshRef.current());

  // Nothing to show yet (mid-refresh) — the Inner only renders this when
  // nbHits > 0, so empty hits means a response is still in flight.
  if (hits.length === 0) return <ResultsSkeleton />;

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
  // Resettable cache so an account switch can drop the stale accumulated pages
  // (the default cache never overwrites an already-cached page).
  const cacheRef = useRef(createResettableInfiniteHitsCache());
  const { items, isLastPage, showMore } = useInfiniteHits<
    Record<string, unknown>
  >({ cache: cacheRef.current as never });
  const { status, refresh } = useInstantSearch();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // On account switch: reset the accumulated pages, then refresh() (clears the
  // helper cache + re-searches). The new account's results repopulate page 0.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useAccountChange(() => {
    cacheRef.current.reset();
    refreshRef.current();
  });

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

  // Accumulated hits were reset (account switch) and the new response hasn't
  // arrived — show the loader, not ProductGrid's "no products" empty state.
  // The Inner only renders this when nbHits > 0, so empty items = in flight.
  if (items.length === 0) return <ResultsSkeleton />;

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
