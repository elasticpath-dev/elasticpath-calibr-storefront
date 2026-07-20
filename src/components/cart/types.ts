import type { BundleComponentItem, ProductField } from "@/context/CartContext";

export type { BundleComponentItem, ProductField };

export type ProductInfo = {
  id: string;
  name: string;
  sku?: string | null;
  priceFormatted?: string;
  imageUrl?: string | null;
  productType: "parent" | "child" | "bundle" | "simple";
  parentId?: string | null;
  variationOptions?: Array<{ variationName: string; optionName: string }>;
};

export type ChildProduct = {
  id: string;
  variationOptions: Array<{ variationName: string; optionName: string }>;
  /** Optional — only populated by callers that fetch per-child pricing (e.g. the listing page's matrix view). MatrixCartRow shows a per-cell price only when present. */
  priceFormatted?: string;
  originalPriceFormatted?: string;
};

export type MatrixGroup = {
  parentId: string;
  parentName: string;
  parentSku?: string | null;
  parentPriceFormatted?: string;
  children: ChildProduct[];
};

export type CartItemEntry = { cartItemId: string; quantity: number };

export type LineGroup =
  | {
      kind: "bundle";
      cartItemId: string;
      name: string;
      sku?: string;
      slug?: string;
      quantity: number;
      unitPrice: string;
      lineTotal: string;
      imageUrl?: string;
      bundleComponents: BundleComponentItem[];
      customInputs?: Record<string, unknown>;
    }
  | {
      kind: "matrix";
      matrixGroup: MatrixGroup;
      cartItemsByProductId: Map<string, CartItemEntry>;
    }
  | {
      kind: "simple";
      cartItemId: string;
      name: string;
      sku?: string;
      slug?: string;
      quantity: number;
      unitPrice: string;
      unitPriceAmount?: number;
      lineTotal: string;
      lineTotalOriginal?: string;
      imageUrl?: string;
      discounts?: import("@/context/CartContext").CartItemDiscount[];
      isSubscription?: boolean;
      subscriptionPlanName?: string;
      subscriptionFrequency?: string;
      isFreeGift?: boolean;
      productFields?: ProductField[];
      customInputs?: Record<string, unknown>;
    };

export function buildMatrix(children: ChildProduct[]): {
  rowAxisName: string | null;
  colAxisName: string;
  rows: string[];
  cols: string[];
  cellMap: Map<string, ChildProduct>;
} | null {
  if (children.length === 0) return null;

  const axisMap = new Map<string, string[]>();
  for (const child of children) {
    for (const opt of child.variationOptions) {
      if (!axisMap.has(opt.variationName)) axisMap.set(opt.variationName, []);
      const vals = axisMap.get(opt.variationName)!;
      if (!vals.includes(opt.optionName)) vals.push(opt.optionName);
    }
  }

  const axes = Array.from(axisMap.entries());
  if (axes.length === 0) return null;

  if (axes.length === 1) {
    const [colAxisName, cols] = axes[0];
    const cellMap = new Map<string, ChildProduct>();
    for (const child of children) {
      const opt = child.variationOptions.find((o) => o.variationName === colAxisName);
      if (opt) cellMap.set(`|${opt.optionName}`, child);
    }
    return { rowAxisName: null, colAxisName, rows: [""], cols, cellMap };
  }

  let rowIdx = axes.findIndex(([name]) => /colou?r/i.test(name));
  if (rowIdx < 0) rowIdx = 0;
  let colIdx = axes.findIndex(([name]) => /size/i.test(name));
  if (colIdx < 0 || colIdx === rowIdx) colIdx = rowIdx === 0 ? 1 : 0;

  const [rowAxisName, rows] = axes[rowIdx];
  const [colAxisName, cols] = axes[colIdx];

  const cellMap = new Map<string, ChildProduct>();
  for (const child of children) {
    const rowOpt = child.variationOptions.find((o) => o.variationName === rowAxisName);
    const colOpt = child.variationOptions.find((o) => o.variationName === colAxisName);
    if (rowOpt && colOpt) {
      cellMap.set(`${rowOpt.optionName}|${colOpt.optionName}`, child);
    }
  }

  return { rowAxisName, colAxisName, rows, cols, cellMap };
}

const SWATCHES: Record<string, string> = {
  Black: "#1A1F29",
  "Heather Grey": "#B8BEC7",
  Forest: "#1F5B3E",
  Navy: "#27324F",
  Maroon: "#6B2230",
  Stone: "#D8CFC0",
  White: "#F5F5F5",
  Red: "#DC2626",
  Blue: "#2563EB",
  Green: "#16A34A",
  Yellow: "#EAB308",
  Pink: "#EC4899",
  Purple: "#7C3AED",
  Orange: "#EA580C",
  Grey: "#9CA3AF",
  Gray: "#9CA3AF",
  Brown: "#78350F",
  Tan: "#D4A96A",
  Cream: "#FFFDD0",
  Beige: "#F5F0DC",
};

export function getColorSwatch(name: string): string | null {
  return SWATCHES[name] ?? null;
}
