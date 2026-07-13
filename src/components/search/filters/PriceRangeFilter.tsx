"use client";

import { useState, useEffect } from "react";
import { useRange } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { getSelectedCurrency } from "@/lib/currency";
import { FilterSection } from "./FilterSection";

type Props = {
  title?: string;
  currencyCode?: string;
};

export function PriceRangeFilter({
  title,
  currencyCode = getSelectedCurrency(),
}: Props) {
  const t = useTranslations("search");
  const { start, range, canRefine, refine } = useRange({
    attribute: `price.${currencyCode}.float_price`,
  });

  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");

  useEffect(() => {
    setMinInput(Number.isFinite(start[0]) ? String(start[0]) : "");
    setMaxInput(Number.isFinite(start[1]) ? String(start[1]) : "");
  }, [start[0], start[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    const min = minInput !== "" ? Number(minInput) : -Infinity;
    const max = maxInput !== "" ? Number(maxInput) : Infinity;
    refine([min, max]);
  };

  if (!canRefine) return null;

  return (
    <FilterSection title={title ?? t("price")} defaultOpen={false}>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">{t("priceMin")}</label>
          <input
            type="number"
            value={minInput}
            placeholder={range.min != null ? String(range.min) : "0"}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={apply}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <span className="text-gray-400 pb-2 text-sm flex-shrink-0">—</span>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">{t("priceMax")}</label>
          <input
            type="number"
            value={maxInput}
            placeholder={range.max != null ? String(range.max) : "∞"}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={apply}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>
      {range.min != null && range.max != null && (
        <p className="mt-1 text-xs text-gray-400">
          {t("priceAvailableRange", { min: range.min, max: range.max })}
        </p>
      )}
    </FilterSection>
  );
}
