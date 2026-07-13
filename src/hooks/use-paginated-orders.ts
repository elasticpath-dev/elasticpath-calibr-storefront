"use client";

import { useState, useEffect, useCallback } from "react";
import { getCustomerOrders } from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";

const DEFAULT_PAGE_SIZE = 10;

export type OrderSummary = {
  id: string;
  orderNumber?: string;
  status?: string;
  payment?: string;
  shipping?: string;
  totalFormatted?: string;
  itemCount?: number;
  createdAt?: string;
};

function rawToOrderSummary(o: any): OrderSummary {
  const itemRefs: any[] | null = o.relationships?.items?.data ?? null;
  const itemCount = itemRefs !== null ? itemRefs.length : undefined;
  return {
    id: o.id ?? "",
    orderNumber: o.order_number ?? undefined,
    status: o.status ?? undefined,
    payment: o.payment ?? undefined,
    shipping: o.shipping ?? undefined,
    totalFormatted:
      o.meta?.display_price?.with_tax?.formatted ??
      o.meta?.display_price?.without_tax?.formatted ??
      undefined,
    itemCount,
    createdAt: o.meta?.timestamps?.created_at ?? undefined,
  };
}

export type PaginatedOrdersResult = {
  orders: OrderSummary[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  isLoading: boolean;
  setPage: (page: number) => void;
  refetch: () => void;
};

export function usePaginatedOrders(pageSize = DEFAULT_PAGE_SIZE): PaginatedOrdersResult {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
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

    getCustomerOrders({
      client,
      query: { "page[limit]": pageSize, "page[offset]": offset },
    })
      .then((res: any) => {
        if (cancelled) return;
        const raw: any[] = res?.data?.data ?? [];
        setOrders(raw.map(rawToOrderSummary));
        const meta = res?.data?.meta;
        setTotalPages(meta?.page?.total ?? 1);
        setTotalResults(meta?.results?.total ?? raw.length);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, pageSize, isAuthenticated, fetchKey]);

  const setPage = useCallback((page: number) => setCurrentPage(page), []);
  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  return { orders, currentPage, totalPages, totalResults, isLoading, setPage, refetch };
}
