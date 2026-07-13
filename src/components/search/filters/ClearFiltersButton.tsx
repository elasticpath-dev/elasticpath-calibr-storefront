"use client";

import { useClearRefinements } from "react-instantsearch";
import { useTranslations } from "next-intl";

export function ClearFiltersButton() {
  const t = useTranslations("search");
  const { canRefine, refine } = useClearRefinements();
  if (!canRefine) return null;
  return (
    <button
      onClick={refine}
      className="text-xs font-medium text-brand-primary hover:underline"
    >
      {t("clearAll")}
    </button>
  );
}
