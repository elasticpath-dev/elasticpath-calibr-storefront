"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Location } from "@epcc-sdk/sdks-shopper";
import { useEpClient } from "@/components/ClientProvider";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { fetchLocations } from "@/lib/api/locations";
import { readLocationCookie, writeLocationCookie } from "@/lib/inventory-location";

/**
 * Multi-location inventory selector for the settings drawer. Fetches all
 * inventory locations (minus the tenant's excluded slugs), persists the chosen
 * one in the `ep_location` cookie, and reloads so stock/add-to-cart pick up the
 * new location. Renders nothing unless multi-location inventory is enabled and
 * at least one non-excluded location exists.
 */
export function LocationSelector() {
  const t = useTranslations("preferences");
  const { multiLocation, excludedLocations, defaultLocation } =
    useTenantConfig();
  const client = useEpClient();
  const excludedKey = excludedLocations.join(",");

  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!multiLocation || !client) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchLocations(client)
      .then((all: Location[]) => {
        if (cancelled) return;
        const excluded = new Set(excludedKey ? excludedKey.split(",") : []);
        const filtered = all.filter((l) => !excluded.has(l.attributes.slug));
        setLocations(filtered);

        const cookie = readLocationCookie();
        // Prefer the shopper's cookie, then the tenant's default location, then
        // the first available location.
        const current =
          (cookie && filtered.find((l) => l.attributes.slug === cookie)) ||
          (defaultLocation &&
            filtered.find((l) => l.attributes.slug === defaultLocation)) ||
          filtered[0];
        if (current) {
          setSelected(current.attributes.slug);
          if (!cookie) writeLocationCookie(current.attributes.slug);
        }
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [multiLocation, client, excludedKey, defaultLocation]);

  if (!multiLocation) return null;
  // Feature on but no usable locations (all excluded or none configured).
  if (!isLoading && locations.length === 0) return null;

  const handleChange = (slug: string) => {
    if (!slug || slug === selected) return;
    setSelected(slug);
    writeLocationCookie(slug);
    // Location drives inventory/stock and the add-to-cart line-item location,
    // so reload to re-resolve everything against the new selection.
    window.location.reload();
  };

  return (
    <section>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
        {t("location")}
      </p>
      {isLoading ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : (
        <Select
          aria-label={t("location")}
          value={selected}
          onChange={(e) => handleChange(e.target.value)}
          options={locations.map((l) => ({
            value: l.attributes.slug,
            label: l.attributes.name,
          }))}
        />
      )}
    </section>
  );
}
