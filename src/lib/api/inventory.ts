import type { Client } from "@hey-api/client-fetch";

export type StockRecord = {
  available: number;
  /** Per-location availability keyed by location slug. Empty when the product
   * isn't set up for multi-location inventory. */
  locations: Record<string, number>;
};

/**
 * Fetches stock for many products in a SINGLE request via the multi-location
 * batch endpoint (POST /v2/inventories/multiple) — never one-by-one. Returns a
 * map keyed by product id; products with no inventory record are simply absent.
 */
export async function fetchMultipleStock(
  client: Client,
  productIds: string[],
): Promise<Record<string, StockRecord>> {
  const out: Record<string, StockRecord> = {};
  const ids = Array.from(new Set(productIds.filter(Boolean)));
  if (ids.length === 0) return out;

  const res = await client.post({
    url: "/v2/inventories/multiple",
    body: { data: ids.map((id) => ({ id })) },
    security: [{ scheme: "bearer", type: "http" }],
  });

  const records = ((res as { data?: { data?: unknown[] } })?.data?.data ??
    []) as Array<{
    id?: string;
    attributes?: {
      available?: unknown;
      locations?: Record<string, { available?: unknown }>;
    };
  }>;

  for (const rec of records) {
    if (!rec?.id) continue;
    const attrs = rec.attributes ?? {};
    const locations: Record<string, number> = {};
    for (const [slug, v] of Object.entries(attrs.locations ?? {})) {
      locations[slug] = Number(v?.available ?? 0);
    }
    out[rec.id] = {
      available: Number(attrs.available ?? 0),
      locations,
    };
  }
  return out;
}
