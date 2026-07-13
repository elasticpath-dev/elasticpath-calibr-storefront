"use client";

import { useSortBy } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { SEARCH_INDEX_NAME } from "@/lib/instantsearch-routing";

export function SortBy() {
  const t = useTranslations("search");

  const items = [
    { value: SEARCH_INDEX_NAME, label: t("sortRelevance") },
    {
      value: `${SEARCH_INDEX_NAME}/sort/price.float_price:asc`,
      label: t("sortPriceLow"),
    },
    {
      value: `${SEARCH_INDEX_NAME}/sort/price.float_price:desc`,
      label: t("sortPriceHigh"),
    },
    {
      value: `${SEARCH_INDEX_NAME}/sort/name:asc`,
      label: t("sortNameAZ"),
    },
    {
      value: `${SEARCH_INDEX_NAME}/sort/name:desc`,
      label: t("sortNameZA"),
    },
  ];

  const { currentRefinement, refine } = useSortBy({ items });

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-500 whitespace-nowrap hidden sm:block">
        {t("sortBy")}:
      </label>
      <select
        value={currentRefinement}
        onChange={(e) => refine(e.target.value)}
        className="text-sm rounded-md border border-gray-200 px-2.5 py-1.5 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white cursor-pointer"
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
