import { createClient } from "@epcc-sdk/sdks-shopper";
import { cookies, headers } from "next/headers";
import { getServerCurrency } from "./currency-server";
import { getTenantConfig } from "./tenant-config";

// Client-context headers we forward from the incoming request onto the
// server-side EPCC API call. Without this, the outbound fetch originates from
// this server, so EP loses the real shopper's IP/geo (country, city, …). We
// forward the client IP plus Vercel's geo headers (x-vercel-ip-*, e.g.
// x-vercel-ip-country/-city/-country-region) as-is so EP can read them
const FORWARDED_CLIENT_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "true-client-ip",
];
const FORWARDED_CLIENT_HEADER_PREFIXES = ["x-vercel-ip"];

function collectClientForwardHeaders(
  incoming: Headers,
): Record<string, string> {
  const out: Record<string, string> = {};
  incoming.forEach((value, key) => {
    const k = key.toLowerCase();
    if (
      FORWARDED_CLIENT_HEADERS.includes(k) ||
      FORWARDED_CLIENT_HEADER_PREFIXES.some((p) => k.startsWith(p))
    ) {
      out[k] = value;
    }
  });
  return out;
}

// Keyed by "endpointUrl:clientId" — in multi-tenant mode, different tenants
// (potentially different EPCC stores) can be resolved within the same
// running server process, so a single global token would leak across them.
const tokenCache = new Map<string, { access_token: string; expires: number }>();
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
  /**
   * Client-context headers (IP / CloudFront viewer geo) collected from the
   * incoming request, forwarded so EP attributes the call to the real shopper.
   * Omitted by callers with no request context (e.g. cached nav build).
   */
  forwardHeaders?: Record<string, string>,
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
    // Forward the shopper's IP / geo so EP's CDN sees the real client, not this
    // server. Set last so nothing above overrides it.
    if (forwardHeaders) {
      for (const [key, value] of Object.entries(forwardHeaders)) {
        request.headers.set(key, value);
      }
    }
    return request;
  });

  return client;
}

export async function createElasticPathClient() {
  let amToken: string | undefined;
  let forwardHeaders: Record<string, string> | undefined;
  try {
    const cookieStore = await cookies();
    amToken = cookieStore.get("ep_am_token")?.value;
  } catch {
    // Outside request context (e.g. build time) — no cookie available
  }
  try {
    forwardHeaders = collectClientForwardHeaders(await headers());
  } catch {
    // Outside request context (e.g. build time) — no incoming headers
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
    forwardHeaders,
  );
}

export type ElasticPathClient = ReturnType<typeof createElasticPathClient>;
