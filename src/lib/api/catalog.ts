import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { getByContextRelease } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClientFromConfig } from "@/lib/create-elastic-path-client";
import { getTenantConfig } from "@/lib/tenant-config";
import { getServerCurrency } from "@/lib/currency-server";

// Resolving the catalog release is a network round-trip that every
// navigation/catalog-id request would otherwise pay for. Cache it per shopper
// context so repeat requests are instant. The account-management token keys
// the entry (the catalog is account-scoped), so switching account resolves a
// fresh catalog immediately; a short TTL still picks up catalog re-publishes.
function getCachedCatalogId(
  endpointUrl: string,
  clientId: string,
  currency: string,
  tokenCurrency: string,
  multiLocation: boolean,
  epContextTag: string | undefined,
  environmentId: string | undefined,
  storeId: string | undefined,
  amToken: string | undefined,
): Promise<string | null> {
  return unstable_cache(
    async () => {
      const client = createElasticPathClientFromConfig(
        {
          endpointUrl,
          clientId,
          currency,
          tokenCurrency,
          multiLocation,
          epContextTag,
          environmentId,
          storeId,
        },
        amToken,
      );
      const response = await getByContextRelease({ client });
      return response.data?.data?.attributes?.catalog_id ?? null;
    },
    [
      "catalog-release-v1",
      endpointUrl,
      storeId ?? "",
      environmentId ?? "",
      epContextTag ?? "",
      currency,
      amToken ?? "",
    ],
    { revalidate: 300 },
  )();
}

/**
 * Resolves the catalog release matching the current shopper context
 * (account, tags, etc. via catalog rules) and returns its catalog_id.
 * Cached per context (see getCachedCatalogId) so it isn't re-fetched on every
 * navigation render.
 */
export async function getResolvedCatalogId(): Promise<string | null> {
  let amToken: string | undefined;
  try {
    amToken = (await cookies()).get("ep_am_token")?.value;
  } catch {
    // Outside request context (e.g. build time) — no cookie available.
  }

  const [currency, tenantConfig] = await Promise.all([
    getServerCurrency(),
    getTenantConfig(),
  ]);
  const { epcc, inventory, requestHeaders } = tenantConfig;

  return getCachedCatalogId(
    epcc.endpointUrl,
    epcc.clientId,
    currency,
    tenantConfig.currency.default,
    inventory.multiLocation,
    requestHeaders.epContextTag,
    requestHeaders.environmentId,
    requestHeaders.storeId,
    amToken,
  );
}
