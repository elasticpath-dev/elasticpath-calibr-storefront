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

  const client = createClient({
    baseUrl: `https://${epcc.endpointUrl}`,
    headers: { "X-MOLTIN-CURRENCY": currency },
  });

  client.interceptors.request.use(async (request) => {
    const token = await getImplicitToken(
      epcc.endpointUrl,
      epcc.clientId,
      tenantConfig.currency.default,
    );
    if (token?.access_token) {
      request.headers.set("Authorization", `Bearer ${token.access_token}`);
    }
    if (inventory.multiLocation) {
      request.headers.set("EP-Inventories-Multi-Location", "true");
    }
    if (requestHeaders.epContextTag) {
      request.headers.set("EP-Context-Tag", requestHeaders.epContextTag);
    }
    if (requestHeaders.environmentId) {
      request.headers.set(
        "X-REQUEST-ENVIRONMENT-ID",
        requestHeaders.environmentId,
      );
    }
    if (requestHeaders.storeId) {
      request.headers.set("X-REQUEST-STORE-ID", requestHeaders.storeId);
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

export type ElasticPathClient = ReturnType<typeof createElasticPathClient>;
