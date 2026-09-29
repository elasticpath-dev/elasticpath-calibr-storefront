import { NextRequest, NextResponse } from "next/server";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import { getVehicleLevel } from "@/lib/vehicle-finder";

// Custom APIs aren't part of the SDK, so they're called directly via the
// hey-api client (same approach as quotes.ts).
const BEARER = [{ scheme: "bearer", type: "http" }] as const;

/**
 * Generic vehicle-finder options endpoint. Query:
 *   level=<lookupType|year|make|model|engine>  — which dropdown to load
 *   <parentKey>=<value>                          — the selected value of each
 *                                                  parent level this one filters by
 *
 * Maps `level` to a Custom API slug (see src/lib/vehicle-finder.ts), applies the
 * parent selections as `eq(field,value)` filters, calls GET /v2/{slug}, and
 * returns normalized `{ options: [{ value, label }] }`.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const level = getVehicleLevel(sp.get("level") ?? "");
  if (!level) {
    return NextResponse.json({ error: "Unknown level" }, { status: 400 });
  }

  // Build the EP filter from the parent selections passed as query params.
  const clauses: string[] = [];
  for (const f of level.filters) {
    const value = sp.get(f.from);
    if (!value) {
      return NextResponse.json(
        { error: `Missing parent selection: ${f.from}` },
        { status: 400 },
      );
    }
    clauses.push(`eq(${f.field},${value})`);
  }

  try {
    const client = await createElasticPathClient();
    const res = await client.get({
      url: `/v2/extensions/${level.slug}`,
      security: BEARER,
      ...(clauses.length ? { query: { filter: clauses.join(":") } } : {}),
    });

    if (res.error) {
      const err = res.error as {
        errors?: Array<{ detail?: string; title?: string }>;
      };
      const detail =
        err?.errors?.[0]?.detail ??
        err?.errors?.[0]?.title ??
        "Failed to load options";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    const records =
      (
        res.data as {
          data?: Array<{ id?: string; attributes?: Record<string, unknown> }>;
        }
      )?.data ?? [];

    const options = records
      .map((r) => {
        const attrs = r.attributes ?? {};
        const value =
          level.valueField === "id"
            ? (r.id ?? "")
            : String(attrs[level.valueField] ?? r.id ?? "");
        const label = String(attrs[level.labelField] ?? value);
        return { value, label };
      })
      .filter((o) => o.value);

    return NextResponse.json({ options });
  } catch (err) {
    console.error("Vehicle finder fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load options" },
      { status: 500 },
    );
  }
}
