"use client";

import { type ReactNode } from "react";
import { useHierarchicalMenu } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CATEGORY_HIERARCHICAL_ATTRIBUTES } from "@/lib/instantsearch-routing";
import { FilterSection } from "./FilterSection";

type Props = {
  title?: string;
  hideNavHierarchy?: boolean;
};

export function CategoryFilter({ title, hideNavHierarchy = false }: Props) {
  const t = useTranslations("search");
  const { items, refine, canToggleShowMore, isShowingMore, toggleShowMore } =
    useHierarchicalMenu({
      attributes: CATEGORY_HIERARCHICAL_ATTRIBUTES,
      limit: 8,
      showMore: true,
      showMoreLimit: 30,
      sortBy: ["count:desc"],
    });

  // The tree is always built from the full lvl0/lvl1/lvl2 chain (see
  // CATEGORY_HIERARCHICAL_ATTRIBUTES) — when the hierarchy root is hidden
  // from the top nav, hide it here too by rendering its children as the
  // top level instead of the root itself.
  const topItems = hideNavHierarchy
    ? items.flatMap((item) => item.data ?? [])
    : items;

  if (!topItems.length) return null;

  function renderItems(list: typeof items, depth = 0): ReactNode {
    return list.map((item) => (
      <div key={item.value}>
        <button
          onClick={() => refine(item.value)}
          className={cn(
            "w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors text-left",
            item.isRefined
              ? "font-semibold text-brand-primary bg-brand-primary/5"
              : "text-gray-700 hover:bg-gray-50",
            depth > 0 && "pl-5",
          )}
        >
          <span className="truncate">{item.label}</span>
          <span className="ml-2 text-xs text-gray-400 flex-shrink-0">{item.count}</span>
        </button>
        {item.data && item.data.length > 0 && (
          <div className="mt-0.5">{renderItems(item.data, depth + 1)}</div>
        )}
      </div>
    ));
  }

  return (
    <FilterSection title={title ?? t("categories")}>
      {renderItems(topItems)}
      {canToggleShowMore && (
        <button
          onClick={toggleShowMore}
          className="mt-2 text-xs font-medium text-brand-primary hover:underline px-2"
        >
          {isShowingMore ? t("showLess") : t("showMore")}
        </button>
      )}
    </FilterSection>
  );
}
