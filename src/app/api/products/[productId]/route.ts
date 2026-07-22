import { NextRequest, NextResponse } from "next/server";
import { getByContextProduct, extractProductImage } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import { parseExtensions } from "@/lib/api/products";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  try {
    const client = await createElasticPathClient();
    const res = await getByContextProduct({
      client,
      path: { product_id: productId },
      query: { include: ["main_image"] },
    });

    const product = res.data?.data;
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = product as any;
    const variationMatrix = raw.meta?.variation_matrix;
    const variations: any[] = raw.meta?.variations ?? [];
    const parentId: string | null =
      raw.relationships?.parent?.data?.id ??
      raw.meta?.base_product_id ??
      null;

    let productType: "parent" | "child" | "bundle" | "simple";
    if (variationMatrix && Object.keys(variationMatrix).length > 0) {
      productType = "parent";
    } else if (variations.length > 0 || parentId) {
      productType = "child";
    } else if (raw.attributes?.components || raw.bundle_configuration) {
      productType = "bundle";
    } else {
      productType = "simple";
    }

    const included = res.data?.included;
    const image = extractProductImage(product, included?.main_images);

    const rawCustomInputs = raw.attributes?.custom_inputs;
    const customInputs =
      rawCustomInputs && typeof rawCustomInputs === "object" && Object.keys(rawCustomInputs).length > 0
        ? rawCustomInputs
        : null;

    const rawExtensions = raw.attributes?.extensions;
    const parsedExtensions =
      rawExtensions && typeof rawExtensions === "object" && Object.keys(rawExtensions).length > 0
        ? await parseExtensions(rawExtensions as Record<string, unknown>)
        : { groups: [], lists: [] };

    return NextResponse.json({
      id: product.id ?? "",
      name: raw.attributes?.name ?? "",
      sku: raw.attributes?.sku ?? null,
      priceFormatted:
        raw.meta?.display_price?.without_tax?.formatted ??
        raw.meta?.display_price?.with_tax?.formatted ??
        "",
      originalPriceFormatted:
        raw.meta?.original_display_price?.without_tax?.formatted ??
        raw.meta?.original_display_price?.with_tax?.formatted ??
        null,
      imageUrl: image?.link?.href ?? null,
      productType,
      parentId,
      customInputs,
      extensions: parsedExtensions.groups.length ? parsedExtensions.groups : null,
      extensionLists: parsedExtensions.lists.length ? parsedExtensions.lists : null,
      variationOptions: variations.map((v: any) => ({
        variationName: v.name ?? "",
        optionName: v.option?.name ?? "",
      })),
    });
  } catch (err) {
    console.error("Product info fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
