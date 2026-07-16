import { NextRequest, NextResponse } from "next/server";
import { clearNavigationCache } from "@/lib/api/navigation";

/**
 * Manually purges the in-memory nav cache (see buildNavCacheKey in
 * navigation.ts) — e.g. after publishing a catalog change, so shoppers don't
 * wait on a stale tree until the server process restarts. Call with a
 * bearer token matching NAV_CACHE_REVALIDATE_SECRET.
 *
 * Body is optional:
 * - Omit it (or send `{}`) to clear the entire cache.
 * - Send `{ catalogId, endpointUrl, storeId, environmentId }` (the same
 *   values used to build the entry — see buildSiteNavigation) to clear just
 *   that one cache key instead.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.NAV_CACHE_REVALIDATE_SECRET || secret !== process.env.NAV_CACHE_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const endpointUrl = body?.endpointUrl;

  if (endpointUrl && typeof endpointUrl === "string") {
    clearNavigationCache({
      catalogId: typeof body.catalogId === "string" ? body.catalogId : null,
      endpointUrl,
      storeId: typeof body.storeId === "string" ? body.storeId : undefined,
      environmentId:
        typeof body.environmentId === "string" ? body.environmentId : undefined,
    });
    return NextResponse.json({ cleared: true, scope: "key" });
  }

  clearNavigationCache();
  return NextResponse.json({ cleared: true, scope: "all" });
}
