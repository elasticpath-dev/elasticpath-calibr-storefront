import { NextRequest, NextResponse } from "next/server";
import {
  getByContextAllProducts,
  getByContextProductsForNode,
  extractProductImage,
  postMultiSearch,
} from "@epcc-sdk/sdks-shopper";
import { getTenantConfig } from "@/lib/tenant-config";
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
    sku: product.attributes?.sku,
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

// Typesense filter_by values are backtick-quoted so ids/skus with special
// characters can't break out of the list.
function searchList(values: string): string {
  return values
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => `\`${v.replace(/`/g, "")}\``)
    .join(",");
}

// Search-hit -> card, same mapping as the client-side hitToCard in
// CategorySearchClient (hit = the search document, with `main_image` merged in
// from the response's `included.main_images`).
function searchHitToCard(
  doc: Record<string, any>,
  included: { main_images?: Array<Record<string, any>> } | undefined,
  currency: string,
): ProductCardData {
  const attrs = (doc.attributes as Record<string, any>) ?? {};
  const meta = (doc.meta as Record<string, any>) ?? {};
  const dp = meta.display_price ?? {};
  const odp = meta.original_display_price ?? {};
  const imageId = doc.relationships?.main_image?.data?.id;
  const image = imageId
    ? included?.main_images?.find((i) => i?.id === imageId)
    : undefined;
  const productTypes = meta.product_types as string[] | undefined;
  return {
    id: doc.id ?? "",
    slug: attrs.slug ?? doc.id ?? "",
    name: attrs.name ?? "",
    sku: attrs.sku,
    description: attrs.description,
    priceFormatted: dp.without_tax?.formatted ?? dp.with_tax?.formatted ?? "",
    originalPriceFormatted:
      odp.without_tax?.formatted ?? odp.with_tax?.formatted ?? undefined,
    imageUrl: image?.link?.href,
    hasVariations: Boolean(attrs.base_product),
    hasBulkBuy: hasBulkBuyForCurrency(attrs, currency),
    isBundle:
      !!productTypes?.includes("bundle") ||
      !!(attrs.components && Object.keys(attrs.components).length > 0),
  };
}

async function searchProducts(
  client: Awaited<ReturnType<typeof createElasticPathClient>>,
  filterBy: string,
  perPage: number,
  currency: string,
): Promise<ProductCardData[]> {
  const res = await postMultiSearch({
    client,
    body: {
      searches: [
        {
          type: "search",
          q: "*",
          query_by: "name,description,sku",
          filter_by: filterBy,
          per_page: perPage,
        } as any,
      ],
    },
    query: { include: ["main_image"] },
  });
  if (res.error || !res.data) {
    throw new Error(`Carousel search failed: ${JSON.stringify(res.error)}`);
  }
  const included = (res.data as any).included;
  return (res.data.results?.[0]?.hits ?? []).map((h) =>
    searchHitToCard(h.document as Record<string, any>, included, currency),
  );
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

    // Search is the master data source: serve the carousel from search, and
    // fall through to the Product API if the search call fails.
    const { features } = await getTenantConfig();
    if (features.searchEnabled && features.searchMasterData) {
      try {
        const filterBy = nodeId
          ? `meta.search.nodes.id:=[${searchList(nodeId)}]`
          : skus
            ? `attributes.sku:=[${searchList(skus)}]`
            : `id:=[${searchList(ids ?? "")}]`;
        const data = await searchProducts(
          client,
          filterBy,
          nodeId ? 24 : 50,
          currency,
        );
        return NextResponse.json({ data });
      } catch (err) {
        console.error("Catalog products search failed, using Product API:", err);
      }
    }

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
