export type TierMap = Record<
  string,
  {
    minimum_quantity?: number;
    price?: Record<string, { amount?: number }>;
  }
>;

/**
 * Bulk buy is only offered when the product's base price and every
 * quantity tier are priced in the given currency — otherwise the
 * tier table would show blank or mixed-currency rows.
 */
export function hasBulkBuyForCurrency(
  attributes: Record<string, unknown> | undefined | null,
  currency: string,
): boolean {
  const tiers = attributes?.tiers as TierMap | undefined;
  if (!tiers || Object.keys(tiers).length === 0) return false;
  const rawPrice = attributes?.price as
    | Record<string, { amount?: number }>
    | undefined;
  if (rawPrice?.[currency]?.amount == null) return false;
  const quantityTiers = Object.values(tiers).filter(
    (t) => t.minimum_quantity != null,
  );
  return (
    quantityTiers.length > 0 &&
    quantityTiers.every((t) => t.price?.[currency]?.amount != null)
  );
}
