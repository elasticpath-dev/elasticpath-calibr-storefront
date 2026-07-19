import type { AlternativePriceRow } from "@/lib/api/products";

type Props = {
  items: AlternativePriceRow[];
  /** Optional section heading (e.g. "Pricing"). */
  heading?: string;
};

/**
 * Pricebook alternative prices shown on the PDP — a compact label/price list
 * (e.g. "Retail Price £247.49", "Members Price £210.00"). Which rows appear
 * and their labels are resolved upstream via resolveAlternativePriceRows from
 * the tenant's alternative-price configuration.
 */
export function AlternativePrices({ items, heading }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {heading && (
        <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
          {heading}
        </p>
      )}
      <dl className="divide-y divide-gray-100">
        {items.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-sm text-gray-600">{row.label}</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {row.formatted}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
