"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useEpClient } from "@/components/ClientProvider";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { fetchLocations } from "@/lib/api/locations";
import { readLocationCookie } from "@/lib/inventory-location";

/**
 * Compact indicator of the shopper's universal selected inventory location,
 * shown in the header next to the search control. Resolves the selected slug
 * (cookie → tenant default → first available) to its display name. Renders
 * nothing unless multi-location inventory is enabled and a location resolves.
 * (The PDP location selector is page-local and does not affect this.)
 */
export function HeaderLocation() {
  const { multiLocation, excludedLocations, defaultLocation } =
    useTenantConfig();
  const client = useEpClient();
  const excludedKey = excludedLocations.join(",");
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!multiLocation || !client) return;
    let cancelled = false;
    fetchLocations(client)
      .then((all) => {
        if (cancelled) return;
        const excluded = new Set(excludedKey ? excludedKey.split(",") : []);
        const filtered = all.filter((l) => !excluded.has(l.attributes.slug));
        const cookie = readLocationCookie();
        const current =
          (cookie && filtered.find((l) => l.attributes.slug === cookie)) ||
          (defaultLocation &&
            filtered.find((l) => l.attributes.slug === defaultLocation)) ||
          filtered[0];
        setName(current?.attributes.name ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [multiLocation, client, defaultLocation, excludedKey]);

  if (!multiLocation || !name) return null;

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 h-9 px-2.5 max-w-[180px] text-gray-600"
      title={name}
    >
      <MapPin size={16} className="text-brand-primary flex-shrink-0" />
      <span className="text-sm truncate">{name}</span>
    </div>
  );
}
