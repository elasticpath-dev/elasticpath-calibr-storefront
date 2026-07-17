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

    // Children only carry id + variation option labels so far (derived
    // straight from each parent's own payload, no extra calls) — fetch their
    // own price in one more batched call so the matrix grid can show a price
    // per cell, matching however many children this request's parent(s) have.
    const childIds = Object.values(parents).flatMap((p) => p.children.map((c) => c.id));
    if (childIds.length > 0) {
      const childResponse = await getByContextAllProducts({
        client,
        query: {
          filter: `in(id,${childIds.join(",")})`,
          "page[limit]": BigInt(100),
        },
      });

      const priceByChildId = new Map<
        string,
        { priceFormatted: string; originalPriceFormatted?: string }
      >();
      for (const child of childResponse.data?.data ?? []) {
        const rawChild = child as any;
        if (!child.id) continue;
        priceByChildId.set(child.id, {
          priceFormatted:
            rawChild.meta?.display_price?.without_tax?.formatted ??
            rawChild.meta?.display_price?.with_tax?.formatted ??
            "",
          originalPriceFormatted:
            rawChild.meta?.original_display_price?.without_tax?.formatted ??
            rawChild.meta?.original_display_price?.with_tax?.formatted ??
            undefined,
        });
      }

      for (const parent of Object.values(parents)) {
        for (const childInfo of parent.children) {
          const price = priceByChildId.get(childInfo.id);
          if (price) Object.assign(childInfo, price);
        }
      }
    }

    return NextResponse.json({ parents });
  } catch (err) {
    console.error("Matrix products fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch matrix products" }, { status: 500 });
  }
}
