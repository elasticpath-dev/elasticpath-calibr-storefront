import { getByContextRelease } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

/**
 * Resolves the catalog release matching the current shopper context
 * (account, tags, etc. via catalog rules) and returns its catalog_id.
 */
export async function getResolvedCatalogId(): Promise<string | null> {
  const client = await createElasticPathClient();
  const response = await getByContextRelease({ client });
  return response.data?.data?.attributes?.catalog_id ?? null;
}
