import { NextRequest, NextResponse } from "next/server";
import { getByContextAllProducts, getByContextProductsForNode, extractProductImage } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import { getServerCurrency } from "@/lib/currency-server";
import { hasBulkBuyForCurrency } from "@/lib/bulk-buy";
import type { ProductCardData } from "@/lib/api/products";
import type { Product, IncludedResponse } from "@epcc-sdk/sdks-shopper";

function formatCard(product: Product, included: IncludedResponse | undefined, currency: string): ProductCardData {
  const image = extractProductImage(product, included?.main_images);
  const price =
    product.meta?.display_price?.without_tax?.formatted ??
    product.meta?.display_price?.with_tax?.formatted ??
    "";
  const originalPrice =
    product.meta?.original_display_price?.without_tax?.formatted ??
    product.meta?.original_display_price?.with_tax?.formatted;
  const variationMatrix = product.meta?.variation_matrix as Record<string, unknown> | undefined;
  const isBundle =
    !!product.meta?.product_types?.includes("bundle") ||
    !!(product.attributes as Record<string, unknown>)?.components;
  return {
    id: product.id ?? "",
    slug: product.attributes?.slug ?? product.id ?? "",
    name: product.attributes?.name ?? "",
    description: product.attributes?.description,
    priceFormatted: price,
    originalPriceFormatted: originalPrice,
    imageUrl: image?.link?.href,
    hasVariations: !!variationMatrix && Object.keys(variationMatrix).length > 0,
    hasBulkBuy: hasBulkBuyForCurrency(
      product.attributes as Record<string, unknown>,
      currency,
    ),
    isBundle,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.trim();
  const nodeId = searchParams.get("nodeId")?.trim();
  const skus = searchParams.get("skus")?.trim();

  if (!ids && !nodeId && !skus) return NextResponse.json({ data: [] });

  try {
    const client = await createElasticPathClient();
    const currency = await getServerCurrency();

    if (nodeId) {
      const response = await getByContextProductsForNode({
        client,
        path: { node_id: nodeId },
        query: { include: ["main_image"], "page[limit]": BigInt(24) },
      });
      const data = (response.data?.data ?? []).map((p) =>
        formatCard(p, response.data?.included, currency),
      );
      return NextResponse.json({ data });
    }

    // skus mode
    if (skus) {
      const response = await getByContextAllProducts({
        client,
        query: {
          filter: `in(sku,${skus})`,
          include: ["main_image"],
          "page[limit]": BigInt(50),
        },
      });
      const data = (response.data?.data ?? []).map((p) =>
        formatCard(p, response.data?.included, currency),
      );
      return NextResponse.json({ data });
    }

    // ids mode
    const response = await getByContextAllProducts({
      client,
      query: {
        filter: `in(id,${ids})`,
        include: ["main_image"],
        "page[limit]": BigInt(50),
      },
    });
    const data = (response.data?.data ?? []).map((p) =>
      formatCard(p, response.data?.included, currency),
    );
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Catalog products fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
