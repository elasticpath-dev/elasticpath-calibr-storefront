import { cookies } from "next/headers";
import { getByContextRelease } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

/** Cookie holding the shopper's resolved catalog_id. Populated client-side
 * (CatalogContext — the literal is duplicated there to avoid importing this
 * server-only module) on first load and refreshed on login/logout/account
 * change, then reused so navigation avoids re-resolving it per request. */
const CATALOG_ID_COOKIE = "ep_catalog_id";

/**
 * Fresh resolve of the catalog release matching the current shopper context
 * (account, tags, etc. via catalog rules). Used to (re)populate the catalog
 * cookie — the client calls this via /api/catalog-id on login/logout/account
 * change.
 */
export async function resolveCatalogIdFromApi(): Promise<string | null> {
  const client = await createElasticPathClient();
  const response = await getByContextRelease({ client });
  return response.data?.data?.attributes?.catalog_id ?? null;
}

/**
 * The current shopper's catalog_id. Reads the cookie the client keeps in sync
 * with the shopper's context (so there's no per-request API call), falling
 * back to a fresh resolve only when the cookie isn't set yet (e.g. the first
 * server render before the client has hydrated).
 */
export async function getResolvedCatalogId(): Promise<string | null> {
  try {
    const cached = (await cookies()).get(CATALOG_ID_COOKIE)?.value;
    if (cached) return cached;
  } catch {
    // Outside request context (e.g. build time) — no cookie available.
  }
  return resolveCatalogIdFromApi();
}
