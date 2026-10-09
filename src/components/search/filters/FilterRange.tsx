"use client";

import { useEffect, useState } from "react";
import { useRange } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { RangeSlider, type RangeSliderValue } from "@/components/ui/RangeSlider";
import { FilterSection } from "./FilterSection";

type Props = {
  /** Numeric facet attribute, e.g. price.float_price. */
  attribute: string;
  name: string;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Numeric range facet (NEXT_PUBLIC_FILTER_ITEMS type "slider"): a dual-thumb
 * slider plus min/max fields. Bounds come from the facet's `stats` (min/max)
 * in the search response — the connector floors/ceils them to whole units —
 * so the attribute must be in facet_by (see buildFacetBy) or the response
 * carries no stats and the section renders nothing.
 */
export function FilterRange({ attribute, name }: Props) {
  const t = useTranslations("search");
  const { start, range, canRefine, refine } = useRange({ attribute });

  const hasBounds = range.min != null && range.max != null;
  const boundsMin = range.min ?? 0;
  const boundsMax = range.max ?? 0;

  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [sliderValue, setSliderValue] = useState<RangeSliderValue>([boundsMin, boundsMax]);

  // Mirror the active refinement (and the result-set bounds) into local state.
  useEffect(() => {
    const curMin = Number.isFinite(start[0]) ? (start[0] as number) : undefined;
    const curMax = Number.isFinite(start[1]) ? (start[1] as number) : undefined;
    setMinInput(curMin != null ? String(curMin) : "");
    setMaxInput(curMax != null ? String(curMax) : "");
    setSliderValue([
      clamp(curMin ?? boundsMin, boundsMin, boundsMax),
      clamp(curMax ?? boundsMax, boundsMin, boundsMax),
    ]);
  }, [start[0], start[1], boundsMin, boundsMax]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyInputs = () => {
    const min = minInput !== "" ? Number(minInput) : undefined;
    const max = maxInput !== "" ? Number(maxInput) : undefined;
    refine([min, max]);
  };

  const onSliderChange = (next: RangeSliderValue) => {
    setSliderValue(next);
    setMinInput(next[0] === boundsMin ? "" : String(next[0]));
    setMaxInput(next[1] === boundsMax ? "" : String(next[1]));
  };

  // A thumb parked on a bound means "no refinement on that side" — pass
  // undefined so the connector drops the refinement instead of pinning it.
  const onSliderCommit = ([lo, hi]: RangeSliderValue) =>
    refine([lo === boundsMin ? undefined : lo, hi === boundsMax ? undefined : hi]);

  if (!canRefine || !hasBounds) return null;

  return (
    <FilterSection title={name}>
      <div className="px-1 pt-1 pb-3">
        <RangeSlider
          min={boundsMin}
          max={boundsMax}
          step={1}
          value={sliderValue}
          onChange={onSliderChange}
          onCommit={onSliderCommit}
          minLabel={`${name} ${t("priceMin")}`}
          maxLabel={`${name} ${t("priceMax")}`}
        />
      </div>
      <div className="flex items-end gap-2">
        <Input
          label={t("priceMin")}
          type="number"
          inputMode="decimal"
          min={boundsMin}
          max={boundsMax}
          value={minInput}
          placeholder={String(boundsMin)}
          onChange={(e) => setMinInput(e.target.value)}
          onBlur={applyInputs}
          onKeyDown={(e) => e.key === "Enter" && applyInputs()}
          wrapperClassName="flex-1 min-w-0"
          className="h-9 px-2.5"
        />
        <span className="pb-2.5 text-sm text-gray-400 flex-shrink-0">—</span>
        <Input
          label={t("priceMax")}
          type="number"
          inputMode="decimal"
          min={boundsMin}
          max={boundsMax}
          value={maxInput}
          placeholder={String(boundsMax)}
          onChange={(e) => setMaxInput(e.target.value)}
          onBlur={applyInputs}
          onKeyDown={(e) => e.key === "Enter" && applyInputs()}
          wrapperClassName="flex-1 min-w-0"
          className="h-9 px-2.5"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {t("priceAvailableRange", { min: boundsMin, max: boundsMax })}
      </p>
    </FilterSection>
  );
}
