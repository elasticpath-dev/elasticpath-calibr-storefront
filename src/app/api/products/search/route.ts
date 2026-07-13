import { NextRequest, NextResponse } from "next/server";
import { getByContextAllProducts } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

type SearchField = "name" | "sku" | "slug";

function buildFilter(field: SearchField, value: string): string {
  if (field === "sku") return `eq(sku,${value})`;
  return `like(${field},*${value}*)`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("name")?.trim();
  const rawField = searchParams.get("field")?.trim() ?? "name";
  const field: SearchField = (["name", "sku", "slug"] as const).includes(rawField as SearchField)
    ? (rawField as SearchField)
    : "name";

  if (!query) return NextResponse.json({ data: [] });

  try {
    const client = await createElasticPathClient();
    const sanitized = query.replace(/[*()]/g, "");
    const response = await getByContextAllProducts({
      client,
      query: { filter: buildFilter(field, sanitized), "page[limit]": BigInt(20) },
    });

    const products = (response.data?.data ?? []).map((p) => ({
      id: p.id ?? "",
      name: p.attributes?.name ?? p.id ?? "",
    }));

    return NextResponse.json({ data: products });
  } catch (err) {
    console.error("Product search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
