import { createClient } from "@epcc-sdk/sdks-shopper";
import { cookies } from "next/headers";
import { getServerCurrency } from "./currency-server";
import { getTenantConfig } from "./tenant-config";

// Keyed by "endpointUrl:clientId" — in multi-tenant mode, different tenants
// (potentially different EPCC stores) can be resolved within the same
// running server process, so a single global token would leak across them.
const tokenCache = new Map<
  string,
  { access_token: string; expires: number }
>();
const tokenFetchPromises = new Map<
  string,
  Promise<{ access_token: string; expires: number }>
>();

async function getImplicitToken(
  endpointUrl: string,
  clientId: string,
  defaultCurrency: string,
): Promise<{ access_token: string; expires: number }> {
  const cacheKey = `${endpointUrl}:${clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() / 1000 < cached.expires - 60) {
    return cached;
  }

  // Deduplicate concurrent fetches for the same tenant
  const inFlight = tokenFetchPromises.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = fetch(`https://${endpointUrl}/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-MOLTIN-CURRENCY": defaultCurrency,
    },
    body: `grant_type=implicit&client_id=${clientId}`,
    cache: "no-store",
  })
    .then((res) => res.json())
    .then((token) => {
      tokenCache.set(cacheKey, token);
      tokenFetchPromises.delete(cacheKey);
      return token as { access_token: string; expires: number };
    })
    .catch((err) => {
      tokenFetchPromises.delete(cacheKey);
      throw err;
    });

  tokenFetchPromises.set(cacheKey, promise);
  return promise;
}

export type ElasticPathClientConfig = {
  endpointUrl: string;
  clientId: string;
  /** Sent as the client's own X-MOLTIN-CURRENCY header on every request. */
  currency: string;
  /**
   * Sent only when requesting the implicit token. getImplicitToken's cache
   * key is endpointUrl:clientId (no currency), so whichever value wins the
   * race to populate that entry sticks for every caller sharing it — pass
   * the tenant's stable default here, not a shopper-varying selection.
   */
  tokenCurrency: string;
  multiLocation: boolean;
  epContextTag?: string;
  environmentId?: string;
  storeId?: string;
};

/**
 * Builds the SDK client from plain, already-resolved config — no
 * cookies()/headers() calls, unlike createElasticPathClient() below. Used
 * directly by navigation.ts's unstable_cache-wrapped nav build, since
 * Next.js disallows both of those dynamic APIs inside a cached function.
 * The account-management token (and so any account-specific catalog rules)
 * is intentionally left out here — navigation.ts's cache key is instead
 * scoped by resolved catalogId, which already captures that variance.
 */
export function createElasticPathClientFromConfig(
  config: ElasticPathClientConfig,
  amToken?: string,
) {
  const client = createClient({
    baseUrl: `https://${config.endpointUrl}`,
    headers: { "X-MOLTIN-CURRENCY": config.currency },
  });

  client.interceptors.request.use(async (request) => {
    const token = await getImplicitToken(
      config.endpointUrl,
      config.clientId,
      config.tokenCurrency,
    );
    if (token?.access_token) {
      request.headers.set("Authorization", `Bearer ${token.access_token}`);
    }
    if (config.multiLocation) {
      request.headers.set("EP-Inventories-Multi-Location", "true");
    }
    if (config.epContextTag) {
      request.headers.set("EP-Context-Tag", config.epContextTag);
    }
    if (config.environmentId) {
      request.headers.set("X-REQUEST-ENVIRONMENT-ID", config.environmentId);
    }
    if (config.storeId) {
      request.headers.set("X-REQUEST-STORE-ID", config.storeId);
    }
    if (amToken) {
      request.headers.set(
        "EP-Account-Management-Authentication-Token",
        amToken,
      );
    }
    return request;
  });

  return client;
}

export async function createElasticPathClient() {
  let amToken: string | undefined;
  try {
    const cookieStore = await cookies();
    amToken = cookieStore.get("ep_am_token")?.value;
  } catch {
    // Outside request context (e.g. build time) — no cookie available
  }
  const [currency, tenantConfig] = await Promise.all([
    getServerCurrency(),
    getTenantConfig(),
  ]);
  const { epcc, inventory, requestHeaders } = tenantConfig;

  return createElasticPathClientFromConfig(
    {
      endpointUrl: epcc.endpointUrl,
      clientId: epcc.clientId,
      currency,
      tokenCurrency: tenantConfig.currency.default,
      multiLocation: inventory.multiLocation,
      epContextTag: requestHeaders.epContextTag,
      environmentId: requestHeaders.environmentId,
      storeId: requestHeaders.storeId,
    },
    amToken,
  );
}

export type ElasticPathClient = ReturnType<typeof createElasticPathClient>;
