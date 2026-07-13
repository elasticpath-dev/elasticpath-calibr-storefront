"use client";

import { useState, useEffect, useCallback } from "react";
import { getCarts } from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";
import type { CartSummary } from "@/context/CartContext";

const DEFAULT_PAGE_SIZE = 10;

function rawToCartSummary(c: any): CartSummary {
  const itemRefs: any[] | null = c.relationships?.items?.data ?? null;
  const itemCount =
    itemRefs !== null
      ? itemRefs.filter((i: any) => i.type === "cart_item").length
      : (c.meta?.item_count ?? undefined);
  return {
    id: c.id ?? "",
    name: c.name ?? c.id ?? "Cart",
    description: c.description ?? undefined,
    totalFormatted:
      c.meta?.display_price?.with_tax?.formatted ??
      c.meta?.display_price?.without_tax?.formatted ??
      undefined,
    itemCount,
    createdAt: c.meta?.timestamps?.created_at ?? undefined,
    updatedAt: (c.meta?.timestamps?.updated_at as string | undefined) ?? undefined,
  };
}

export type PaginatedCartsResult = {
  carts: CartSummary[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  isLoading: boolean;
  setPage: (page: number) => void;
  refetch: () => void;
};

export function usePaginatedCarts(pageSize = DEFAULT_PAGE_SIZE): PaginatedCartsResult {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [carts, setCarts] = useState<CartSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setIsLoading(true);

    const offset = (currentPage - 1) * pageSize;
    const client = createEpClient();

    (getCarts as any)({
      client,
      query: { "page[limit]": pageSize, "page[offset]": offset },
    })
      .then((res: any) => {
        if (cancelled) return;
        const raw: any[] = res?.data?.data ?? [];
        setCarts(raw.map(rawToCartSummary));
        const meta = res?.data?.meta;
        setTotalPages(meta?.page?.total ?? 1);
        setTotalResults(meta?.results?.total ?? raw.length);
      })
      .catch(() => {
        if (!cancelled) setCarts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentPage, pageSize, isAuthenticated, fetchKey]);

  const setPage = useCallback((page: number) => setCurrentPage(page), []);
  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  return { carts, currentPage, totalPages, totalResults, isLoading, setPage, refetch };
}
