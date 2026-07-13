"use client";

import { useRefinementList } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { FilterSection } from "./FilterSection";

type Props = {
  attribute: string;
  name: string;
  limit?: number;
};

export function FilterCheckbox({ attribute, name, limit = 10 }: Props) {
  const t = useTranslations("search");
  const { items, refine, canToggleShowMore, isShowingMore, toggleShowMore } =
    useRefinementList({ attribute, limit, showMore: true, showMoreLimit: 50, sortBy: ["count:desc"] });

  if (!items.length) return null;

  return (
    <FilterSection title={name}>
      {items.map((item) => (
        <label
          key={item.value}
          className="flex items-center gap-2.5 py-1 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={item.isRefined}
            onChange={() => refine(item.value)}
            className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
          />
          <span
            className={cn(
              "text-sm flex-1 truncate transition-colors",
              item.isRefined
                ? "font-semibold text-brand-primary"
                : "text-gray-700 group-hover:text-gray-900",
            )}
          >
            {item.label}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">{item.count}</span>
        </label>
      ))}
      {canToggleShowMore && (
        <button
          onClick={toggleShowMore}
          className="mt-1 text-xs font-medium text-brand-primary hover:underline"
        >
          {isShowingMore ? t("showLess") : t("showMore")}
        </button>
      )}
    </FilterSection>
  );
}
