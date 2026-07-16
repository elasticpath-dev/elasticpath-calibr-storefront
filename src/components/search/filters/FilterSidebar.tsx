"use client";

import { useTranslations } from "next-intl";
import { ClearFiltersButton } from "./ClearFiltersButton";
import { CategoryFilter } from "./CategoryFilter";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { ProductSpecification } from "./ProductSpecification";

type Props = {
  showCategories?: boolean;
  showPriceRange?: boolean;
  currencyCode?: string;
  filterItems?: string;
  hideNavHierarchy?: boolean;
};

export function FilterSidebar({
  showCategories = true,
  showPriceRange = true,
  currencyCode,
  filterItems,
  hideNavHierarchy = false,
}: Props) {
  const t = useTranslations("search");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2 pb-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">{t("filters")}</span>
        <ClearFiltersButton />
      </div>
      {showCategories && <CategoryFilter hideNavHierarchy={hideNavHierarchy} />}
      {showPriceRange && <PriceRangeFilter currencyCode={currencyCode} />}
      <ProductSpecification filterItems={filterItems} />
    </div>
  );
}
