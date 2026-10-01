import { NextRequest, NextResponse } from "next/server";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

// The search endpoint isn't part of the SDK, so it's called directly via the
// hey-api client (same approach as the booking / vehicle-finder routes).
const BEARER = [{ scheme: "bearer", type: "http" }] as const;

// Path (relative to the EP base URL) that the search request is POSTed to.
// Override via SEARCH_ENDPOINT_PATH if the search API lives at a different path.
const SEARCH_PATH = process.env.SEARCH_ENDPOINT_PATH || "/search";

/**
 * Proxies faceted product search to Elastic Path's POST /search. The client
 * sends { query, filters, limit, offset }; we forward it and return the raw
 * search response (items + facets + total + hasMore) for the UI to render.
 *
 * filters shape (per the search contract):
 *   { and: [ { field, op: "eq", value }, { or: [ … ] }, … ] }
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    query?: unknown;
    filters?: unknown;
    profile_id?: unknown;
    limit?: unknown;
    offset?: unknown;
  };

  const outbound: Record<string, unknown> = {
    query: typeof body.query === "string" ? body.query : "",
  };
  if (body.filters && typeof body.filters === "object") {
    outbound.filters = body.filters;
  }
  if (typeof body.profile_id === "string" && body.profile_id) {
    outbound.profile_id = body.profile_id;
  }
  if (typeof body.limit === "number") outbound.limit = body.limit;
  if (typeof body.offset === "number") outbound.offset = body.offset;

  // Forward the client's search visitor id (cookie-backed) so the backend can
  // track the visitor across search requests.
  const visitorId = req.headers.get("search-visitor-id");

  try {
    // Timing: how long building the EP client takes, vs. how long the search
    // endpoint itself takes to respond.
    const clientStart = performance.now();
    const client = await createElasticPathClient();
    const clientMs = performance.now() - clientStart;

    const searchStart = performance.now();
    const res = await client.post({
      url: SEARCH_PATH,
      security: BEARER,
      headers: {
        "Content-Type": "application/json",
        ...(visitorId ? { "search-visitor-id": visitorId } : {}),
      },
      body: outbound,
    });
    const searchMs = performance.now() - searchStart;

    console.log(
      `[search] client ${clientMs.toFixed(0)}ms | ${SEARCH_PATH} ${searchMs.toFixed(
        0,
      )}ms | status ${res.response?.status ?? "n/a"}`,
    );

    if (res.error) {
      const err = res.error as {
        errors?: Array<{ detail?: string; title?: string }>;
      };
      const detail =
        err?.errors?.[0]?.detail ??
        err?.errors?.[0]?.title ??
        "Search failed";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    return NextResponse.json(res.data ?? {});
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
