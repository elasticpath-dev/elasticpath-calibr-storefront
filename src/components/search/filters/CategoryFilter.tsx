"use client";

import { type ReactNode } from "react";
import { useHierarchicalMenu } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { FilterSection } from "./FilterSection";

const HIERARCHICAL_ATTRIBUTES = [
  "meta.search.categories.lvl0",
  "meta.search.categories.lvl1",
  "meta.search.categories.lvl2",
];

type Props = {
  title?: string;
};

export function CategoryFilter({ title }: Props) {
  const t = useTranslations("search");
  const { items, refine, canToggleShowMore, isShowingMore, toggleShowMore } =
    useHierarchicalMenu({
      attributes: HIERARCHICAL_ATTRIBUTES,
      limit: 8,
      showMore: true,
      showMoreLimit: 30,
      sortBy: ["count:desc"],
    });

  if (!items.length) return null;

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
      {renderItems(items)}
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
