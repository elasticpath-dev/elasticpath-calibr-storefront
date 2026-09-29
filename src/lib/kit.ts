/**
 * Kit lookup — fetches a product kit for a selected vehicle engine from Elastic
 * Path and normalizes it into ordered sections of products.
 *
 * Called against the same Elastic Path endpoint as the rest of the storefront:
 * `GET /kit/{kitId}` (via createElasticPathClient, so auth/store headers are
 * applied). Its exact response shape is tenant-specific, so `normalizeKit` is
 * deliberately tolerant: it accepts sections as an array
 * (`{ sections: [{ key, title, products }] }`), as an object map
 * (`{ engine_oil: [...], oil_filter: [...] }`), or as the root object itself,
 * and reads product fields under several common aliases.
 */

import { createElasticPathClient } from "./create-elastic-path-client";
import type { ProductVariation } from "./api/products";

// Kit isn't part of the SDK, so it's called directly via the hey-api client
// (same approach as quotes.ts / the vehicle-finder route).
const BEARER = [{ scheme: "bearer", type: "http" }] as const;

export type KitProduct = {
  id?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price?: string;
  partNumber?: string;
  url?: string;
  /** Set when the entry is a full Elastic Path PXM product (has `attributes`).
   * These render as a full-width row with an inline variation selector +
   * add to cart — all built from the fields below (no extra product fetch). */
  productId?: string;
  slug?: string;
  /** Bullet highlights from attributes.extensions["products(highlights)"]. */
  highlights?: string[];
  /** Variations + matrix from product meta, for the inline selector. */
  variations?: ProductVariation[];
  variationMatrix?: Record<string, unknown>;
  commodityType?: string;
};

export type KitSection = {
  key: string;
  title: string;
  products: KitProduct[];
};

export type KitVehicle = {
  year?: string;
  make?: string;
  model?: string;
  engine?: string;
};

export type Kit = {
  kitId: string;
  vehicle?: KitVehicle;
  sections: KitSection[];
};

// Friendly titles for known section keys; anything else is title-cased.
const SECTION_LABELS: Record<string, string> = {
  engine_oil: "Engine Oil",
  motor_oil: "Motor Oil",
  oil_filter: "Oil Filters",
  air_filter: "Air Filters",
  cabin_air_filter: "Cabin Air Filters",
  fuel_filter: "Fuel Filters",
  coolant: "Coolant & Antifreeze",
  transmission_fluid: "Transmission Fluid",
  brake_fluid: "Brake Fluid",
  power_steering_fluid: "Power Steering Fluid",
  differential_fluid: "Differential Fluid",
  grease: "Grease",
  fuel_additive: "Fuel Additives",
  wiper_blade: "Wiper Blades",
  battery: "Batteries",
  spark_plug: "Spark Plugs",
};

// Root keys that are metadata, not product sections.
const META_KEYS = new Set([
  "kit_id",
  "kitId",
  "id",
  "vehicle",
  "meta",
  "links",
  "sections",
  "products",
  "categories",
]);

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function firstDefined(
  obj: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Maps a section's `included.main_images` by file id → image href. */
function buildImageMap(included: unknown): Map<string, string> {
  const map = new Map<string, string>();
  const imgs = (included as { main_images?: unknown[] } | undefined)
    ?.main_images;
  for (const f of asArray(imgs)) {
    const ff = (f ?? {}) as Record<string, unknown>;
    const id = str(ff.id);
    const href = str((ff.link as Record<string, unknown> | undefined)?.href);
    if (id && href) map.set(id, href);
  }
  return map;
}

/**
 * A section's `products` can be a bare array, or the EP list shape
 * `{ data: [...], included: { main_images } }`. Returns the product array plus
 * the per-section image map (id → href) resolved from `included`.
 */
function sectionProducts(value: unknown): {
  items: unknown[];
  imageMap: Map<string, string>;
} {
  if (Array.isArray(value)) return { items: value, imageMap: new Map() };
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return {
      items: asArray(firstDefined(v, ["data", "items", "products"])),
      imageMap: buildImageMap(v.included),
    };
  }
  return { items: [], imageMap: new Map() };
}

function titleForSection(key: string, given?: string): string {
  if (given) return given;
  return (
    SECTION_LABELS[key] ??
    key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  );
}

/** Resolves a product's main image href from the section image map via
 * relationships.main_image.data.id, falling back to any inline image field. */
function resolveMainImage(
  p: Record<string, unknown>,
  imageMap?: Map<string, string>,
): string | undefined {
  const rel = p.relationships as Record<string, unknown> | undefined;
  const data = (rel?.main_image as Record<string, unknown> | undefined)
    ?.data as Record<string, unknown> | undefined;
  const id = str(data?.id);
  const fromMap = id ? imageMap?.get(id) : undefined;
  return (
    fromMap ??
    str(
      firstDefined(p.attributes as Record<string, unknown> | undefined ?? {}, [
        "main_image_url",
        "image_url",
        "image",
      ]) ?? firstDefined(p, ["main_image_url", "image_url", "image"]),
    )
  );
}

function toProduct(raw: unknown, imageMap?: Map<string, string>): KitProduct {
  const p = (raw ?? {}) as Record<string, unknown>;

  // Elastic Path PXM product shape: { id, type: "product", attributes: {…} }.
  // Everything needed to render the inline row (variations, price, image) is
  // read straight from the response — no extra product fetch.
  const attrs = p.attributes as Record<string, unknown> | undefined;
  if (attrs && typeof attrs === "object" && p.type === "product") {
    const meta = (p.meta ?? {}) as Record<string, unknown>;
    const dp = meta.display_price as
      | { without_tax?: { formatted?: string }; with_tax?: { formatted?: string } }
      | undefined;

    // Highlights extension → bullet list.
    const ext = attrs.extensions as Record<string, unknown> | undefined;
    const hl = ext?.["products(highlights)"] as
      | Record<string, unknown>
      | undefined;
    const highlights = hl
      ? Object.values(hl).filter((v): v is string => typeof v === "string")
      : undefined;

    // Variations straight from meta (id/name/options) for the inline selector.
    const rawVariations = (meta.variations as unknown[]) ?? [];
    const variations: ProductVariation[] = rawVariations.map((v) => {
      const vv = (v ?? {}) as Record<string, unknown>;
      return {
        id: str(vv.id) ?? "",
        name: str(vv.name) ?? "",
        options: ((vv.options as unknown[]) ?? []).map((o) => {
          const oo = (o ?? {}) as Record<string, unknown>;
          return {
            id: str(oo.id) ?? "",
            name: str(oo.name) ?? "",
            description: str(oo.description),
          };
        }),
      };
    });

    return {
      id: str(p.id),
      productId: str(p.id),
      slug: str(attrs.slug),
      name: str(firstDefined(attrs, ["name", "title"])) ?? "",
      partNumber: str(firstDefined(attrs, ["sku", "external_ref"])),
      description: str(attrs.description),
      price: str(dp?.without_tax?.formatted ?? dp?.with_tax?.formatted),
      imageUrl: resolveMainImage(p, imageMap),
      highlights: highlights?.length ? highlights : undefined,
      variations: variations.length ? variations : undefined,
      variationMatrix: meta.variation_matrix as
        | Record<string, unknown>
        | undefined,
      commodityType: str(attrs.commodity_type),
    };
  }

  return {
    id: str(firstDefined(p, ["id", "product_id", "productId", "sku"])),
    name:
      str(firstDefined(p, ["name", "title", "product_name", "productName"])) ??
      "",
    description: str(
      firstDefined(p, ["description", "desc", "subtitle", "size", "summary"]),
    ),
    imageUrl: str(
      firstDefined(p, [
        "image_url",
        "imageUrl",
        "image",
        "thumbnail",
        "img",
        "image_src",
      ]),
    ),
    price: str(
      firstDefined(p, [
        "price",
        "price_display",
        "formatted_price",
        "display_price",
        "msrp",
      ]),
    ),
    partNumber: str(
      firstDefined(p, ["part_number", "partNumber", "sku", "code", "part_no"]),
    ),
    url: str(firstDefined(p, ["url", "link", "product_url", "href", "buy_url"])),
  };
}

function extractVehicle(root: Record<string, unknown>): KitVehicle | undefined {
  const v = (root.vehicle ?? root) as Record<string, unknown>;
  const vehicle: KitVehicle = {
    year: str(firstDefined(v, ["year"])),
    make: str(firstDefined(v, ["make", "make_name"])),
    model: str(firstDefined(v, ["model", "model_name"])),
    engine: str(firstDefined(v, ["engine", "engine_name"])),
  };
  return vehicle.make || vehicle.model || vehicle.year || vehicle.engine
    ? vehicle
    : undefined;
}

export function normalizeKit(kitId: string, json: unknown): Kit {
  const root = ((json as Record<string, unknown>)?.data ??
    json ??
    {}) as Record<string, unknown>;

  const vehicle = extractVehicle(root);
  const rawSections = firstDefined(root, [
    "sections",
    "products",
    "categories",
  ]);

  let sections: KitSection[] = [];

  const buildProducts = (value: unknown): KitProduct[] => {
    const { items, imageMap } = sectionProducts(value);
    return items.map((p) => toProduct(p, imageMap)).filter((p) => p.name);
  };

  if (Array.isArray(rawSections)) {
    sections = rawSections.map((s) => {
      const sec = (s ?? {}) as Record<string, unknown>;
      const key = str(firstDefined(sec, ["key", "id", "name", "slug"])) ?? "";
      return {
        key,
        title: titleForSection(key, str(firstDefined(sec, ["title", "label"]))),
        products: buildProducts(sec.products),
      };
    });
  } else if (rawSections && typeof rawSections === "object") {
    sections = Object.entries(rawSections as Record<string, unknown>).map(
      ([key, v]) => ({
        key,
        title: titleForSection(key),
        products: buildProducts(v),
      }),
    );
  } else {
    // The root object itself is the section→products map.
    sections = Object.entries(root)
      .filter(([k]) => !META_KEYS.has(k))
      .map(([key, v]) => ({
        key,
        title: titleForSection(key),
        products: buildProducts(v),
      }))
      .filter((s) => s.products.length || Array.isArray(root[s.key]));
  }

  // Empty sections are kept — the page renders them with a "no compatible
  // products" note so the customer sees every category was checked.
  return { kitId, vehicle, sections };
}

export async function getKit(kitId: string): Promise<Kit | null> {
  const client = await createElasticPathClient();
  const res = await client.get({
    url: `/kit/${encodeURIComponent(kitId)}`,
    security: BEARER,
  });

  if (res.error) {
    if (res.response?.status === 404) return { kitId, sections: [] };
    throw new Error(
      `Kit request failed: ${res.response?.status ?? "unknown error"}`,
    );
  }

  return normalizeKit(kitId, res.data);
}
