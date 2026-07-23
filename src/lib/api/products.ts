import {
  getByContextAllProducts,
  getByContextProduct,
  getByContextProductsForNode,
  getByContextProductsForHierarchy,
  getByContextAllRelatedProducts,
  getAllFiles,
  extractProductImage,
  type Product,
  type IncludedResponse,
} from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getServerCurrency } from "@/lib/currency-server";
import { hasBulkBuyForCurrency, type TierMap } from "@/lib/bulk-buy";
import { getTenantConfig } from "@/lib/tenant-config";

export type BulkBuyTier = {
  quantityRange: string;
  priceFormatted: string;
};

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  sku?: string;
  priceFormatted: string;
  originalPriceFormatted?: string;
  imageUrl?: string;
  description?: string;
  hasVariations?: boolean;
  hasBulkBuy?: boolean;
  isBundle?: boolean;
  /** "physical" | "digital" — from the EP product's commodity_type attribute. */
  commodityType?: string;
};

export type ProductVariationOption = {
  id: string;
  name: string;
  description?: string;
  sortOrder?: number;
};

export type ProductVariation = {
  id: string;
  name: string;
  options: ProductVariationOption[];
  sortOrder?: number;
};

export type BundleComponentOption = {
  id: string;
  name: string;
  sku?: string;
  imageUrl?: string;
  quantity: number;
  min?: number;
  max?: number;
  sortOrder: number;
  isDefault: boolean;
  priceFormatted?: string;
  originalPriceFormatted?: string;
  saleId?: string;
};

export type BundleComponent = {
  key: string;
  name: string;
  min: number;
  max: number;
  sortOrder: number;
  options: BundleComponentOption[];
};

export type ProductCustomInput = {
  name: string;
  required: boolean;
  validation_rules: unknown[];
};

export type ProductExtensionField = {
  key: string;
  label: string;
  value: string;
};

export type ProductExtensionGroup = {
  key: string;
  title: string;
  fields: ProductExtensionField[];
};

/** An extension whose value is an array of strings — rendered as a bullet list
 * (under the product description) rather than a key/value table. `title` is the
 * extension name (the `products(<name>)` part). */
export type ProductExtensionList = {
  key: string;
  title: string;
  items: string[];
};

export type ProductDetailData = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  priceFormatted: string;
  originalPriceFormatted?: string;
  sku?: string;
  imageUrl?: string;
  additionalImages?: string[];
  variations?: ProductVariation[];
  variationMatrix?: Record<string, unknown>;
  selectedOptionIds?: string[];
  productType?: string;
  parentId?: string;
  saleId?: string;
  isBundle?: boolean;
  /** "physical" | "digital" — from the EP product's commodity_type attribute. */
  commodityType?: string;
  components?: BundleComponent[];
  bulkBuyTiers?: BulkBuyTier[];
  customRelationshipSlugs?: string[];
  customInputs?: Record<string, ProductCustomInput>;
  extensions?: ProductExtensionGroup[];
  /** Array-of-strings extensions, shown as bullet lists under the description. */
  extensionLists?: ProductExtensionList[];
  breadCrumbNodes?: string[];
  breadCrumbs?: Record<string, string[]>;
  /** Pricebook "alternative_prices" from product meta, as-parsed (unfiltered).
   * Display selection/labeling is applied via resolveAlternativePriceRows. */
  alternativePrices?: AlternativePrice[];
};

export type AlternativePrice = {
  /** EP pricebook id — matched against the tenant's configured list. */
  pricebookId?: string;
  /** The pricebook's own name (meta `name`) — used as the fallback label. */
  name: string;
  /** display_price formatted value (without_tax preferred, else with_tax). */
  formatted: string;
};

/** A resolved, ready-to-render alternative price row. */
export type AlternativePriceRow = { label: string; formatted: string };

function parseAlternativePrices(raw: unknown): AlternativePrice[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map((entry): AlternativePrice | null => {
      const e = entry as Record<string, unknown> | null;
      const dp = e?.display_price as
        | { without_tax?: { formatted?: string }; with_tax?: { formatted?: string } }
        | undefined;
      const formatted = dp?.without_tax?.formatted ?? dp?.with_tax?.formatted;
      if (!formatted) return null;
      return {
        pricebookId: typeof e?.pricebook_id === "string" ? e.pricebook_id : undefined,
        name: typeof e?.name === "string" ? e.name : "",
        formatted,
      };
    })
    .filter((x): x is AlternativePrice => x !== null);
  return out.length > 0 ? out : undefined;
}

/**
 * Applies the tenant's alternative-price configuration to a product's parsed
 * alternative prices, yielding the rows to render on the PDP:
 * - feature off → nothing.
 * - configured pricebooks → only those, in config order, using config labels
 *   (a configured id with no matching price is skipped).
 * - no configured pricebooks → every alternative price, labeled by meta name.
 * Any alternative price equal to the product's main price is dropped (no point
 * showing the same figure twice). Returns [] when nothing remains.
 */
export function resolveAlternativePriceRows(
  alternativePrices: AlternativePrice[] | undefined,
  config: {
    showAlternativePrices: boolean;
    alternativePriceBooks: Array<{ pricebookId: string; label: string }>;
  },
  mainPriceFormatted?: string,
): AlternativePriceRow[] {
  if (!config.showAlternativePrices || !alternativePrices?.length) return [];

  const isMainPrice = (formatted: string) =>
    !!mainPriceFormatted && formatted.trim() === mainPriceFormatted.trim();

  if (config.alternativePriceBooks.length > 0) {
    return config.alternativePriceBooks
      .map(({ pricebookId, label }) => {
        const match = alternativePrices.find((p) => p.pricebookId === pricebookId);
        return match && !isMainPrice(match.formatted)
          ? { label, formatted: match.formatted }
          : null;
      })
      .filter((r): r is AlternativePriceRow => r !== null);
  }

  return alternativePrices
    .filter((p) => p.name && !isMainPrice(p.formatted))
    .map((p) => ({ label: p.name, formatted: p.formatted }));
}

function toTitleCase(slug: string): string {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function parseExtensions(
  raw: Record<string, unknown>,
): Promise<{ groups: ProductExtensionGroup[]; lists: ProductExtensionList[] }> {
  const { features } = await getTenantConfig();
  const excluded = features.extensionsExcluded;

  const groups: ProductExtensionGroup[] = [];
  const lists: ProductExtensionList[] = [];

  for (const [extKey, extValue] of Object.entries(raw)) {
    const match = extKey.match(/\(([^)]+)\)/);
    const name = match ? match[1] : extKey;
    if (excluded.includes(name.toLowerCase())) continue;

    // Array value → bullet list (shown under the description, not in the table).
    if (Array.isArray(extValue)) {
      const items = extValue
        .filter((v) => v !== null && v !== undefined && v !== "")
        .map((v) => String(v));
      if (items.length > 0) {
        lists.push({ key: name, title: toTitleCase(name), items });
      }
      continue;
    }

    if (!extValue || typeof extValue !== "object") continue;

    const fields: ProductExtensionField[] = Object.entries(
      extValue as Record<string, unknown>,
    )
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([fieldKey, fieldValue]) => ({
        key: fieldKey,
        label: toTitleCase(fieldKey),
        value: String(fieldValue),
      }));

    if (fields.length === 0) continue;

    groups.push({ key: name, title: toTitleCase(name), fields });
  }

  return { groups, lists };
}

export type MatrixChildInfo = {
  id: string;
  variationOptions: Array<{ variationName: string; optionName: string }>;
  /** Populated separately (see /api/products/matrix) — deriveMatrixChildren itself never calls any API. */
  priceFormatted?: string;
  originalPriceFormatted?: string;
};

/**
 * Derives every child product's variation options directly from a parent's
 * meta.variation_matrix + meta.variations — no per-child API calls needed.
 * Each variation_matrix leaf is a child product ID; the option IDs on the
 * path to that leaf are looked up (independent of nesting order) against
 * variations[].options to get their display names.
 */
export function deriveMatrixChildren(
  variationMatrix: Record<string, unknown> | undefined,
  variations:
    | Array<{ name?: string; options?: Array<{ id?: string; name?: string }> }>
    | undefined,
): MatrixChildInfo[] {
  if (!variationMatrix || !variations?.length) return [];

  const optionLookup = new Map<string, { variationName: string; optionName: string }>();
  for (const v of variations) {
    for (const o of v.options ?? []) {
      if (o.id) optionLookup.set(o.id, { variationName: v.name ?? "", optionName: o.name ?? "" });
    }
  }

  const children: MatrixChildInfo[] = [];
  function traverse(node: unknown, optionPath: string[]) {
    if (typeof node === "string") {
      children.push({
        id: node,
        variationOptions: optionPath
          .map((optionId) => optionLookup.get(optionId))
          .filter((v): v is { variationName: string; optionName: string } => !!v),
      });
    } else if (node && typeof node === "object") {
      for (const [optionId, value] of Object.entries(node as Record<string, unknown>)) {
        traverse(value, [...optionPath, optionId]);
      }
    }
  }
  traverse(variationMatrix, []);
  return children;
}

function formatProduct(
  product: Product,
  included?: IncludedResponse,
  selectedCurrency?: string,
): ProductCardData {
  const image = extractProductImage(product, included?.main_images);
  const price =
    product.meta?.display_price?.without_tax?.formatted ??
    product.meta?.display_price?.with_tax?.formatted ??
    "";
  const originalPrice =
    product.meta?.original_display_price?.without_tax?.formatted ??
    product.meta?.original_display_price?.with_tax?.formatted;
  const variationMatrix = product.meta?.variation_matrix as
    | Record<string, unknown>
    | undefined;
  const isBundle =
    !!product.meta?.product_types?.includes("bundle") ||
    !!(
      product.attributes?.components &&
      Object.keys(product.attributes.components).length > 0
    );
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
      selectedCurrency ?? DEFAULT_CURRENCY,
    ),
    isBundle,
    commodityType: product.attributes?.commodity_type,
  };
}

async function formatProductDetail(
  product: Product,
  included?: IncludedResponse,
  selectedCurrency?: string,
): Promise<ProductDetailData> {
  const mainImage = extractProductImage(product, included?.main_images);
  const additionalImages = (included?.files ?? [])
    .filter((f) => f.link?.href && f.id !== mainImage?.id)
    .map((f) => f.link!.href!)
    .filter(Boolean);

  const isBundle =
    !!product.meta?.product_types?.includes("bundle") ||
    !!(
      product.attributes?.components &&
      Object.keys(product.attributes.components).length > 0
    );

  let components: BundleComponent[] | undefined;
  if (isBundle && product.attributes?.components) {
    const cpMap = new Map<string, Product>();
    for (const cp of included?.component_products ?? []) {
      if (cp.id) cpMap.set(cp.id, cp);
    }

    components = Object.entries(product.attributes.components)
      .map(([key, comp]) => {
        const options: BundleComponentOption[] = (comp.options ?? [])
          .filter((opt) => opt.id)
          .map((opt) => {
            const optProduct = cpMap.get(opt.id!);
            const optImage = optProduct
              ? extractProductImage(optProduct, included?.main_images)
              : undefined;
            return {
              id: opt.id!,
              name: optProduct?.attributes?.name ?? opt.id!,
              sku: optProduct?.attributes?.sku,
              imageUrl: optImage?.link?.href,
              quantity: opt.quantity ?? opt.min ?? 1,
              min: opt.min != null ? opt.min : undefined,
              max: opt.max != null ? opt.max : undefined,
              sortOrder: opt.sort_order ?? 0,
              isDefault: opt.default ?? false,
              priceFormatted:
                optProduct?.meta?.display_price?.without_tax?.formatted ??
                optProduct?.meta?.display_price?.with_tax?.formatted,
              originalPriceFormatted:
                optProduct?.meta?.original_display_price?.without_tax
                  ?.formatted ??
                optProduct?.meta?.original_display_price?.with_tax?.formatted,
              saleId: optProduct?.meta?.sale_id,
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return {
          key,
          name: comp.name ?? key,
          min: comp.min ?? 1,
          max: comp.max ?? 1,
          sortOrder: comp.sort_order ?? 0,
          options,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const variations: ProductVariation[] = (product.meta?.variations ?? [])
    .map((v) => ({
      id: v.id ?? "",
      name: v.name ?? "",
      sortOrder: v.sort_order ?? 0,
      options: (v.options ?? [])
        .sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))
        .map((o) => ({
          id: o.id ?? "",
          name: o.name ?? "",
          description: o.description ?? undefined,
          sortOrder: o.sort_order ?? 0,
        })),
    }))
    .filter((v) => v.id && v.options.length > 0)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const selectedOptionIds = product.meta?.child_option_ids?.length
    ? (product.meta.child_option_ids as string[])
    : undefined;

  let bulkBuyTiers: BulkBuyTier[] | undefined;
  const currency = selectedCurrency ?? DEFAULT_CURRENCY;
  // Only build tiers when the selected currency is fully priced —
  // otherwise the bulk buy section is hidden.
  if (
    hasBulkBuyForCurrency(
      product.attributes as Record<string, unknown>,
      currency,
    )
  ) {
    const rawTiers = (product.attributes as Record<string, unknown>)
      ?.tiers as TierMap;
    const rawPrice = (product.attributes as Record<string, unknown>)?.price as
      | Record<string, { amount?: number }>
      | undefined;
    const baseAmount = rawPrice?.[currency]?.amount ?? 0;
    const fmt = new Intl.NumberFormat("en", { style: "currency", currency });
    const messages = Object.values(rawTiers)
      .filter((t) => t.minimum_quantity != null)
      .map((t) => ({
        quantity: t.minimum_quantity!,
        price: fmt.format(t.price![currency].amount! / 100),
      }))
      .sort((a, b) => a.quantity - b.quantity);
    let lastQty = 1;
    let lastPrice = fmt.format(baseAmount / 100);
    const rows: BulkBuyTier[] = [];
    for (const msg of messages) {
      rows.push({
        quantityRange: `${lastQty} - ${msg.quantity - 1}`,
        priceFormatted: lastPrice,
      });
      lastQty = msg.quantity;
      lastPrice = msg.price;
    }
    rows.push({ quantityRange: `${lastQty} +`, priceFormatted: lastPrice });
    bulkBuyTiers = rows;
  }

  const customRelationshipSlugs =
    (product.meta?.custom_relationships as string[] | undefined)?.filter(
      Boolean,
    ) ?? undefined;

  const rawCustomInputs = (product.attributes as Record<string, unknown>)
    ?.custom_inputs as Record<string, unknown> | undefined;
  const customInputs: Record<string, ProductCustomInput> | undefined =
    rawCustomInputs && Object.keys(rawCustomInputs).length > 0
      ? (rawCustomInputs as Record<string, ProductCustomInput>)
      : undefined;

  const rawExtensions = (product.attributes as Record<string, unknown>)
    ?.extensions as Record<string, unknown> | undefined;
  const parsedExtensions =
    rawExtensions && Object.keys(rawExtensions).length > 0
      ? await parseExtensions(rawExtensions)
      : { groups: [], lists: [] };

  return {
    id: product.id ?? "",
    slug: product.attributes?.slug ?? product.id ?? "",
    name: product.attributes?.name ?? "",
    description: product.attributes?.description,
    priceFormatted:
      product.meta?.display_price?.without_tax?.formatted ??
      product.meta?.display_price?.with_tax?.formatted ??
      "",
    originalPriceFormatted:
      product.meta?.original_display_price?.without_tax?.formatted ??
      product.meta?.original_display_price?.with_tax?.formatted,
    sku: product.attributes?.sku,
    imageUrl: mainImage?.link?.href,
    additionalImages,
    variations: variations.length > 0 ? variations : undefined,
    variationMatrix: product.meta?.variation_matrix as
      | Record<string, unknown>
      | undefined,
    selectedOptionIds,
    productType: product.meta?.product_types?.[0],
    saleId: product.meta?.sale_id ?? undefined,
    isBundle,
    commodityType: product.attributes?.commodity_type,
    components,
    bulkBuyTiers,
    customRelationshipSlugs: customRelationshipSlugs?.length
      ? customRelationshipSlugs
      : undefined,
    customInputs,
    extensions: parsedExtensions.groups.length
      ? parsedExtensions.groups
      : undefined,
    extensionLists: parsedExtensions.lists.length
      ? parsedExtensions.lists
      : undefined,
    breadCrumbNodes: (product.meta?.bread_crumb_nodes as string[] | undefined)?.length
      ? (product.meta!.bread_crumb_nodes as string[])
      : undefined,
    breadCrumbs: (() => {
      const raw = product.meta?.bread_crumbs as Record<string, string[]> | undefined;
      return raw && Object.keys(raw).length > 0 ? raw : undefined;
    })(),
    alternativePrices: parseAlternativePrices(
      (product.meta as Record<string, unknown> | undefined)?.alternative_prices,
    ),
  };
}

export async function getFeaturedProducts(
  limit = 8,
): Promise<ProductCardData[]> {
  const client = await createElasticPathClient();
  const response = await getByContextAllProducts({
    client,
    query: {
      include: ["main_image"],
      filter: "in(product_types,standard,parent)",
      "page[limit]": BigInt(limit),
    },
  });
  const products = response.data?.data ?? [];
  const currency = await getServerCurrency();
  return products.map((p) => formatProduct(p, response.data?.included, currency));
}

export async function getProductsForHierarchy(
  hierarchyId: string,
  limit = 24,
): Promise<ProductCardData[]> {
  const client = await createElasticPathClient();
  const response = await getByContextProductsForHierarchy({
    client,
    path: { hierarchy_id: hierarchyId },
    query: {
      include: ["main_image"],
      "page[limit]": BigInt(limit),
    },
  });
  const products = response.data?.data ?? [];
  const currency = await getServerCurrency();
  return products.map((p) => formatProduct(p, response.data?.included, currency));
}

export async function getProductsForNode(
  nodeId: string,
  limit = 24,
): Promise<ProductCardData[]> {
  const client = await createElasticPathClient();
  const response = await getByContextProductsForNode({
    client,
    path: { node_id: nodeId },
    query: {
      include: ["main_image"],
      "page[limit]": BigInt(limit),
    },
  });
  const products = response.data?.data ?? [];
  const currency = await getServerCurrency();
  return products.map((p) => formatProduct(p, response.data?.included, currency));
}

/**
 * EP's `main_image` include only resolves images for the top-level products,
 * not for a bundle's included component_products (they carry a main_image
 * relationship, but the file itself isn't returned in included.main_images).
 * Fetch those image files explicitly and merge them into main_images so
 * extractProductImage can resolve each bundle option's thumbnail.
 */
async function enrichComponentProductImages(
  client: Awaited<ReturnType<typeof createElasticPathClient>>,
  included: IncludedResponse | undefined,
): Promise<void> {
  const comps = included?.component_products;
  if (!included || !comps?.length) return;

  const have = new Set((included.main_images ?? []).map((f) => f.id));
  const missing = Array.from(
    new Set(
      comps
        .map((cp) => cp.relationships?.main_image?.data?.id)
        .filter((id): id is string => Boolean(id) && !have.has(id)),
    ),
  );
  if (missing.length === 0) return;

  const fetched: unknown[] = [];
  // The files endpoint caps page size, so batch in chunks of 100.
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    try {
      const res = await getAllFiles({
        client,
        query: {
          filter: `in(id,${chunk.join(",")})`,
          "page[limit]": BigInt(chunk.length),
        } as any,
      });
      const files = res.data?.data;
      if (files?.length) fetched.push(...files);
    } catch {
      // Non-fatal — affected options just render without a thumbnail.
    }
  }

  if (fetched.length) {
    included.main_images = [
      ...(included.main_images ?? []),
      ...(fetched as NonNullable<IncludedResponse["main_images"]>),
    ];
  }
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetailData | null> {
  const client = await createElasticPathClient();
  const response = await getByContextAllProducts({
    client,
    query: {
      filter: `eq(slug,${slug})`,
      include: ["main_image", "files", "component_products"],
    },
  });
  const product = response.data?.data?.[0];
  if (!product) return null;

  // Bundles: pull in the component products' image files (see helper).
  if (response.data?.included) {
    await enrichComponentProductImages(client, response.data.included);
  }

  const currency = await getServerCurrency();
  const formatted = await formatProductDetail(
    product,
    response.data?.included,
    currency,
  );

  if (formatted.productType === "child") {
    // Fetch parent product to get the full variation list
    const parentId =
      ((product.attributes as Record<string, unknown>)?.base_product_id as
        | string
        | undefined) ??
      (product.relationships?.parent?.data as { id?: string } | undefined)?.id;

    if (parentId) {
      formatted.parentId = parentId;
      const parentRes = await getByContextProduct({
        client,
        path: { product_id: parentId },
        query: {},
      });
      const parentProduct = parentRes.data?.data;
      if (parentProduct) {
        const parentFormatted = await formatProductDetail(
          parentProduct,
          undefined,
          currency,
        );
        if (parentFormatted.variations)
          formatted.variations = parentFormatted.variations;
        if (parentFormatted.variationMatrix) {
          formatted.variationMatrix = parentFormatted.variationMatrix;
        }
        if (!formatted.customInputs && parentFormatted.customInputs) {
          formatted.customInputs = parentFormatted.customInputs;
        }
        if (!formatted.extensions?.length && parentFormatted.extensions?.length) {
          formatted.extensions = parentFormatted.extensions;
        }
        if (
          !formatted.extensionLists?.length &&
          parentFormatted.extensionLists?.length
        ) {
          formatted.extensionLists = parentFormatted.extensionLists;
        }
      }
    }
  }

  return formatted;
}

export type RelationshipCarousel = {
  slug: string;
  products: ProductCardData[];
};

export async function getProductRelationshipCarousels(
  productId: string,
  slugs: string[],
): Promise<RelationshipCarousel[]> {
  if (!slugs.length) return [];
  const client = await createElasticPathClient();
  const currency = await getServerCurrency();
  const results = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const response = await getByContextAllRelatedProducts({
          client,
          path: { product_id: productId, custom_relationship_slug: slug },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: { "page[limit]": BigInt(24), include: ["main_image"] } as any,
        });
        const products = (response.data?.data ?? []).map((p) =>
          formatProduct(p, response.data?.included, currency),
        );
        if (!products.length) return null;
        return { slug, products };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is RelationshipCarousel => r !== null);
}

export async function getProductById(
  productId: string,
): Promise<ProductDetailData | null> {
  const client = await createElasticPathClient();
  const response = await getByContextProduct({
    client,
    path: { product_id: productId },
    query: { include: ["main_image", "files"] },
  });
  const product = response.data?.data;
  if (!product) return null;
  return formatProductDetail(
    product,
    response.data?.included as IncludedResponse,
    await getServerCurrency(),
  );
}
