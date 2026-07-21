"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStock } from "@epcc-sdk/sdks-shopper";
import { useEpClient } from "@/components/ClientProvider";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { fetchLocations } from "@/lib/api/locations";
import { readLocationCookie } from "@/lib/inventory-location";

export type LocationInventory = {
  slug: string;
  name: string;
  available: number;
  total: number;
};

export type ProductInventory = {
  /** Multi-location inventory is enabled AND this product has per-location stock. */
  enabled: boolean;
  isLoading: boolean;
  /** All (non-excluded) locations with this product's stock. Empty when the
   * product isn't set up for multi-location inventory (falls back to normal
   * add-to-cart, no gating). */
  locations: LocationInventory[];
  selectedSlug: string | null;
  selected: LocationInventory | null;
  available: number | null;
  outOfStock: boolean;
  /** Change the active location for THIS PDP only — updates stock/gating and
   * the location sent on add-to-cart, without touching the universal cookie
   * (header pill, settings, other pages are unaffected). */
  select: (slug: string) => void;
};

/**
 * Fetches a product's inventory across every location in a single getStock call
 * (its `attributes.locations` map holds them all) and joins it with the
 * memoized location list for display names. Resolves the initial location from
 * the universal cookie → tenant default → first, and lets the shopper switch
 * locations for this PDP only (no extra API calls, no cookie change).
 */
export function useProductInventory(
  productId?: string | null,
): ProductInventory {
  const { multiLocation, excludedLocations, defaultLocation } =
    useTenantConfig();
  const client = useEpClient();
  const excludedKey = excludedLocations.join(",");
  const active = multiLocation && !!client && !!productId;

  const [locations, setLocations] = useState<LocationInventory[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(active);

  useEffect(() => {
    if (!active) {
      setLocations([]);
      setSelectedSlug(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      fetchLocations(client),
      getStock({ client, path: { product_uuid: productId! } }).catch(
        () => null,
      ),
    ])
      .then(([locs, stockRes]) => {
        if (cancelled) return;
        const attrs = (
          stockRes as { data?: { data?: { attributes?: unknown } } } | null
        )?.data?.data?.attributes as
          | { locations?: Record<string, { available?: unknown; total?: unknown }> }
          | undefined;
        const stockLocations = attrs?.locations;

        // Product isn't set up for multi-location inventory → fall back to the
        // normal (ungated) add-to-cart flow.
        if (!stockLocations || Object.keys(stockLocations).length === 0) {
          setLocations([]);
          setSelectedSlug(null);
          return;
        }

        const excluded = new Set(excludedKey ? excludedKey.split(",") : []);
        const combined: LocationInventory[] = locs
          .filter((l) => !excluded.has(l.attributes.slug))
          .map((l) => {
            const s = stockLocations[l.attributes.slug];
            return {
              slug: l.attributes.slug,
              name: l.attributes.name,
              available: s ? Number(s.available ?? 0) : 0,
              total: s ? Number(s.total ?? 0) : 0,
            };
          });
        setLocations(combined);

        const cookie = readLocationCookie();
        const init =
          (cookie && combined.find((c) => c.slug === cookie)) ||
          (defaultLocation &&
            combined.find((c) => c.slug === defaultLocation)) ||
          combined[0];
        if (init) setSelectedSlug(init.slug);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, client, productId, excludedKey, defaultLocation]);

  const selected = useMemo(
    () => locations.find((l) => l.slug === selectedSlug) ?? null,
    [locations, selectedSlug],
  );

  // Page-local only — deliberately does not write the cookie.
  const select = useCallback((slug: string) => {
    setSelectedSlug(slug);
  }, []);

  return {
    enabled: active && locations.length > 0,
    isLoading,
    locations,
    selectedSlug,
    selected,
    available: selected ? selected.available : null,
    outOfStock:
      active &&
      !isLoading &&
      locations.length > 0 &&
      (!selected || selected.available <= 0),
    select,
  };
}
