"use client";

import { useTranslations } from "next-intl";
import type { ProductVariation } from "@/lib/api/products";

type Props = {
  variations: ProductVariation[];
  variationMatrix: Record<string, unknown>;
  onProductResolved: (productId: string | null) => void;
  selectedOptions: Record<string, string>;
  onOptionChange: (variationId: string, optionId: string) => void;
};

function resolveChildProductId(
  matrix: Record<string, unknown>,
  optionIds: string[],
): string | null {
  function traverse(node: unknown, remaining: string[]): string | null {
    if (typeof node === "string") return node;
    if (!node || typeof node !== "object") return null;
    const map = node as Record<string, unknown>;
    for (const optionId of remaining) {
      if (map[optionId] !== undefined) {
        const rest = remaining.filter((id) => id !== optionId);
        const result = traverse(map[optionId], rest);
        if (result) return result;
      }
    }
    return null;
  }
  return traverse(matrix, optionIds);
}

/**
 * Returns true if selecting `optionId` for `variationId` can lead to at least
 * one valid product — accounting for all currently-selected options in other
 * variations and enumerating any that are still unselected.
 */
function isOptionAvailable(
  variations: ProductVariation[],
  matrix: Record<string, unknown>,
  variationId: string,
  optionId: string,
  selectedOptions: Record<string, string>,
): boolean {
  const hypothetical = { ...selectedOptions, [variationId]: optionId };
  const unselected = variations.filter((v) => !hypothetical[v.id]);

  function check(remaining: ProductVariation[], current: Record<string, string>): boolean {
    if (remaining.length === 0) {
      const ids = variations.map((v) => current[v.id]);
      return resolveChildProductId(matrix, ids) !== null;
    }
    const [head, ...tail] = remaining;
    return head.options.some((opt) => check(tail, { ...current, [head.id]: opt.id }));
  }

  return check(unselected, hypothetical);
}

export function ProductVariationSelector({
  variations,
  variationMatrix,
  onProductResolved,
  selectedOptions,
  onOptionChange,
}: Props) {
  const t = useTranslations("product");

  function handleSelect(variationId: string, optionId: string) {
    const updated = { ...selectedOptions, [variationId]: optionId };
    onOptionChange(variationId, optionId);

    const allSelected = variations.every((v) => updated[v.id]);
    if (allSelected) {
      const optionIds = variations.map((v) => updated[v.id]);
      const childId = resolveChildProductId(variationMatrix, optionIds);
      onProductResolved(childId);
    } else {
      onProductResolved(null);
    }
  }

  return (
    <div className="space-y-5">
      {variations.map((variation) => (
        <div key={variation.id}>
          <p className="text-sm font-medium text-gray-700 mb-2">{variation.name}</p>
          <div className="flex flex-wrap gap-2">
            {variation.options.map((option) => {
              const isSelected = selectedOptions[variation.id] === option.id;
              const isDisabled = !isOptionAvailable(
                variations,
                variationMatrix,
                variation.id,
                option.id,
                selectedOptions,
              );
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isDisabled}
                  aria-label={t("selectOption", { name: option.description ?? option.name })}
                  aria-pressed={isSelected}
                  onClick={() => handleSelect(variation.id, option.id)}
                  className={[
                    "relative px-4 py-2 rounded-lg text-sm font-medium border transition-colors overflow-hidden",
                    isDisabled
                      ? "cursor-not-allowed opacity-40 bg-gray-50 text-gray-400 border-gray-200"
                      : isSelected
                      ? "bg-brand-primary text-white border-brand-primary"
                      : "bg-white text-gray-700 border-gray-300 hover:border-brand-primary",
                  ].join(" ")}
                >
                  {option.description ?? option.name}
                  {isDisabled && (
                    <span className="absolute inset-0 pointer-events-none" aria-hidden="true">
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <line
                          x1="8" y1="92" x2="92" y2="8"
                          stroke="var(--color-ink-400)"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
