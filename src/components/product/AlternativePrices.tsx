import { cn } from "@/lib/utils";
import type { AlternativePriceRow } from "@/lib/api/products";

type Props = {
  items: AlternativePriceRow[];
  className?: string;
};

/**
 * Pricebook alternative prices shown just under the main PDP price — a compact
 * inline "Label price" list (e.g. "Retail £247.49 · Members £210.00"). Which
 * rows appear and their labels are resolved upstream via
 * resolveAlternativePriceRows from the tenant's alternative-price config.
 */
export function AlternativePrices({ items, className }: Props) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-4 gap-y-1",
        className,
      )}
    >
      {items.map((row, i) => (
        <span key={i} className="inline-flex items-baseline gap-1.5 text-sm">
          <span className="text-gray-500">{row.label}</span>
          <span className="font-semibold text-gray-900">{row.formatted}</span>
        </span>
      ))}
    </div>
  );
}
