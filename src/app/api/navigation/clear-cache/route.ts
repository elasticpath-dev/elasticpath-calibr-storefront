import { NextRequest, NextResponse } from "next/server";
import { clearNavigationCache } from "@/lib/api/navigation";

/**
 * Manually purges the navigation cache (unstable_cache, keyed by catalog_id)
 * — e.g. after publishing a catalog change, so shoppers don't wait on a stale
 * tree. Call with a bearer token matching NAV_CACHE_REVALIDATE_SECRET.
 *
 * Body is optional:
 * - `{ catalogId }` clears just that catalog's navigation (and its subtrees).
 * - Omit it (or send `{}`) to clear the entire navigation cache.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.NAV_CACHE_REVALIDATE_SECRET || secret !== process.env.NAV_CACHE_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const catalogId = typeof body?.catalogId === "string" ? body.catalogId : null;

  if (catalogId) {
    clearNavigationCache(catalogId);
    return NextResponse.json({ cleared: true, scope: "catalog", catalogId });
  }

  clearNavigationCache();
  return NextResponse.json({ cleared: true, scope: "all" });
}
