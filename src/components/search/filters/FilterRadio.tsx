"use client";

import { useToggleRefinement } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { FilterSection } from "./FilterSection";

type Props = {
  attribute: string;
  name: string;
};

export function FilterRadio({ attribute, name }: Props) {
  const t = useTranslations("search");
  const { value, refine } = useToggleRefinement({ attribute });

  return (
    <FilterSection title={name}>
      <label className="flex items-center gap-3 cursor-pointer py-0.5">
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={value.isRefined}
            onChange={() => refine({ isRefined: !value.isRefined })}
          />
          <div className="w-10 h-5 rounded-full bg-gray-200 peer-checked:bg-brand-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </div>
        <span className="text-sm text-gray-700">
          {value.isRefined ? t("on") : t("off")}
        </span>
      </label>
    </FilterSection>
  );
}
