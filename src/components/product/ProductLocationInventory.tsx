"use client";

import { useState } from "react";
import { MapPin, Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ProductInventory } from "@/hooks/use-product-inventory";

/**
 * PDP multi-location stock: shows availability at the active location and a
 * "Check other locations" toggle that reveals every location with its
 * inventory count. Picking one switches the active location (updating stock,
 * add-to-cart, and the header pill). Renders nothing when the product has no
 * multi-location inventory.
 */
export function ProductLocationInventory({
  inventory,
}: {
  inventory: ProductInventory;
}) {
  const t = useTranslations("product");
  const [open, setOpen] = useState(false);

  if (!inventory.enabled) {
    // Still loading the first time, or product has no per-location stock.
    return inventory.isLoading ? (
      <div className="h-5 w-40 rounded bg-gray-100 animate-pulse" />
    ) : null;
  }

  const { selected, locations, selectedSlug, select } = inventory;
  const selectedAvailable = selected?.available ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center gap-2 text-sm font-semibold",
            selectedAvailable > 0 ? "text-green-700" : "text-red-600",
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              selectedAvailable > 0 ? "bg-green-500" : "bg-red-500",
            )}
            aria-hidden="true"
          />
          {selectedAvailable > 0 ? t("inStock") : t("outOfStock")}
          {selectedAvailable > 0 && (
            <span className="font-normal text-gray-500">
              {t("unitsAvailable", { count: selectedAvailable })}
            </span>
          )}
        </span>

        {selected && (
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <MapPin size={14} className="text-brand-primary" />
            {selected.name}
          </span>
        )}

        {locations.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
          >
            {t("checkOtherLocations")}
            <ChevronDown
              size={14}
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      {open && locations.length > 1 && (
        <ul className="max-h-60 overflow-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {locations.map((loc) => {
            const isSelected = loc.slug === selectedSlug;
            const inStock = loc.available > 0;
            return (
              <li key={loc.slug}>
                <button
                  type="button"
                  onClick={() => {
                    select(loc.slug);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MapPin
                      size={16}
                      className="text-brand-primary flex-shrink-0"
                    />
                    <span
                      className={cn(
                        "truncate text-sm",
                        isSelected
                          ? "font-semibold text-gray-900"
                          : "text-gray-700",
                      )}
                    >
                      {loc.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        inStock
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700",
                      )}
                    >
                      {inStock
                        ? t("unitsAvailableBadge", { count: loc.available })
                        : t("outOfStock")}
                    </span>
                    {isSelected && (
                      <Check size={16} className="text-brand-primary" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
