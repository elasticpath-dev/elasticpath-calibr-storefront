import { NextRequest, NextResponse } from "next/server";
import { getByContextAllProducts } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import { deriveMatrixChildren } from "@/lib/api/products";

/**
 * Batched matrix-cart endpoint: given multiple parent product IDs, fetches
 * them in a single EP call and derives every child's variation options from
 * each parent's own meta.variation_matrix/meta.variations — replacing what
 * used to be one /children request per parent.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.trim();
  if (!ids) return NextResponse.json({ parents: {} });

  try {
    const client = await createElasticPathClient();
    const response = await getByContextAllProducts({
      client,
      query: {
        filter: `in(id,${ids})`,
        "page[limit]": BigInt(50),
      },
    });

    const parents: Record<
      string,
      {
        id: string;
        name: string;
        sku: string | null;
        priceFormatted: string;
        children: ReturnType<typeof deriveMatrixChildren>;
      }
    > = {};

    for (const product of response.data?.data ?? []) {
      const raw = product as any;
      const variationMatrix = raw.meta?.variation_matrix as Record<string, unknown> | undefined;
      const variations = raw.meta?.variations ?? [];
      if (!product.id) continue;

      parents[product.id] = {
        id: product.id,
        name: raw.attributes?.name ?? "",
        sku: raw.attributes?.sku ?? null,
        priceFormatted:
          raw.meta?.display_price?.without_tax?.formatted ??
          raw.meta?.display_price?.with_tax?.formatted ??
          "",
        children: deriveMatrixChildren(variationMatrix, variations),
      };
    }

    return NextResponse.json({ parents });
  } catch (err) {
    console.error("Matrix products fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch matrix products" }, { status: 500 });
  }
}
