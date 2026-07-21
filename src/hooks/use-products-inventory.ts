"use client";

import { useEffect, useMemo, useState } from "react";
import { useEpClientOptional } from "@/components/ClientProvider";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { fetchMultipleStock } from "@/lib/api/inventory";
import { readLocationCookie } from "@/lib/inventory-location";

/**
 * Batch-fetches stock for a list of products (one request) and reports which
 * are out of stock at the shopper's location (cookie → tenant default). Used by
 * product grids/carousels/search to gate the add-to-cart button.
 *
 * A product is "out of stock" only when it HAS per-location inventory and the
 * resolved location has none — products without multi-location inventory are
 * never gated. Inert when multi-location inventory is disabled.
 */
export function useProductsInventory(productIds: string[]): {
  outOfStockById: Record<string, boolean>;
  isLoading: boolean;
} {
  const { multiLocation, defaultLocation } = useTenantConfig();
  const client = useEpClientOptional();
  const slug = multiLocation
    ? (readLocationCookie() ?? defaultLocation ?? "")
    : "";

  // Stable key so the effect only refetches when the actual set of ids changes.
  const idsKey = useMemo(
    () => Array.from(new Set(productIds.filter(Boolean))).sort().join(","),
    [productIds],
  );

  const [outOfStockById, setOutOfStockById] = useState<Record<string, boolean>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!multiLocation || !client || !idsKey) {
      setOutOfStockById({});
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchMultipleStock(client, idsKey.split(","))
      .then((stock) => {
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        for (const [id, rec] of Object.entries(stock)) {
          const locSlugs = Object.keys(rec.locations);
          if (locSlugs.length === 0) continue; // no MLI for this product — don't gate
          const available = slug
            ? (rec.locations[slug] ?? 0)
            : rec.available;
          map[id] = available <= 0;
        }
        setOutOfStockById(map);
      })
      .catch(() => {
        if (!cancelled) setOutOfStockById({});
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [multiLocation, client, idsKey, slug]);

  return { outOfStockById, isLoading };
}
