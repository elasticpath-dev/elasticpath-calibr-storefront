"use client";

import { useEffect } from "react";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { readLocationCookie, writeLocationCookie } from "@/lib/inventory-location";

/**
 * On first load, seed the `ep_location` cookie with the tenant's configured
 * default location when multi-location inventory is enabled and no location has
 * been chosen yet. This makes add-to-cart / stock lookups target the default
 * location without the shopper having to open the settings drawer first. A
 * cookie already set (a prior default or the shopper's own choice) is left as-is.
 */
export function LocationCookieInit() {
  const { multiLocation, defaultLocation } = useTenantConfig();
  useEffect(() => {
    if (!multiLocation || !defaultLocation) return;
    if (readLocationCookie()) return;
    writeLocationCookie(defaultLocation);
  }, [multiLocation, defaultLocation]);
  return null;
}
