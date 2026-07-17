"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, LayoutList, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ProductCard } from "./ProductCard";
import { Button } from "@/components/ui/Button";
import type { ChildProduct, MatrixGroup } from "@/components/cart/types";
import { useCart } from "@/context/CartContext";
import { useTenantConfig } from "@/context/TenantConfigContext";
import {
  readViewModeCookie,
  writeViewModeCookie,
} from "@/lib/view-mode-cookie";
import type { ProductCardData } from "@/lib/api/products";

const VIEW_MODE_COOKIE = "product_view_mode";

// Matches GET /api/products/matrix's per-parent response shape exactly —
// NOT the same field names as MatrixGroup (parentId/parentName/...), which
// is the shape MatrixCartRow itself expects and what we map this into.
type MatrixApiParent = {
  id: string;
  name: string;
  sku: string | null;
  priceFormatted: string;
  children: ChildProduct[];
};

type ProductGridProps = {
  products: ProductCardData[];
  lang: string;
};

export function ProductGrid({ products, lang }: ProductGridProps) {
  const t = useTranslations("search");
  const tProduct = useTranslations("product");
  const { addItems, isLoading } = useCart();
  const { fullWidth } = useTenantConfig();
  const [viewMode, setViewModeState] = useState<"list" | "grid">("list");
  const [bulkMode, setBulkMode] = useState(false);
  const [pendingQtys, setPendingQtys] = useState<Map<string, number>>(
    new Map(),
  );
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [matrixByParentId, setMatrixByParentId] = useState<
    Map<string, MatrixGroup>
  >(new Map());
  const fetchedParentIds = useRef<Set<string>>(new Set());

  // Sync from cookie after hydration — matches B2BCartContent's view-mode pattern.
  useEffect(() => {
    setViewModeState(readViewModeCookie(VIEW_MODE_COOKIE, "list"));
  }, []);

  const setViewMode = useCallback((mode: "list" | "grid") => {
    writeViewModeCookie(VIEW_MODE_COOKIE, mode);
    setViewModeState(mode);
  }, []);

  const toggleBulkMode = useCallback(() => {
    setBulkMode((prev) => !prev);
    // Entering or leaving bulk mode both start every product's quantity back at 0.
    setPendingQtys(new Map());
  }, []);

  const handleBulkQuantityChange = useCallback(
    (productId: string, quantity: number) => {
      setPendingQtys((prev) => {
        const next = new Map(prev);
        if (quantity > 0) next.set(productId, quantity);
        else next.delete(productId);
        return next;
      });
    },
    [],
  );

  const pendingCount = pendingQtys.size;

  // Maps a variation child's product id back to its parent + " / "-joined
  // option names — the exact customInputs shape the PDP (VariantAddToCart)
  // and cart's own matrix rows (B2BCartContent) both use, and which the
  // cart's line-grouping logic depends on to recognize a child as a
  // variation of that parent rather than a standalone simple product.
  const childInfoByProductId = useMemo(() => {
    const map = new Map<string, { parentId: string; options: string }>();
    for (const group of matrixByParentId.values()) {
      for (const child of group.children) {
        if (child.variationOptions.length > 0) {
          map.set(child.id, {
            parentId: group.parentId,
            options: child.variationOptions
              .map((o) => o.optionName)
              .join(" / "),
          });
        }
      }
    }
    return map;
  }, [matrixByParentId]);

  const enrichWithCustomInputs = useCallback(
    (items: Array<{ productId: string; quantity: number }>) =>
      items.map(({ productId, quantity }) => {
        const info = childInfoByProductId.get(productId);
        return {
          productId,
          quantity,
          customInputs: info
            ? { parent_product_id: info.parentId, options: info.options }
            : undefined,
        };
      }),
    [childInfoByProductId],
  );

  const handleAddAllToCart = useCallback(async () => {
    const items = enrichWithCustomInputs(
      Array.from(pendingQtys.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
      })),
    );
    if (items.length === 0) return;

    setIsAddingAll(true);
    try {
      await addItems(items);
      toast.success(t("addAllToCartSuccess", { count: items.length }));
      setPendingQtys(new Map());
    } catch (err) {
      const epErrors = (err as Record<string, unknown>)?.errors;
      if (Array.isArray(epErrors) && epErrors.length > 0) {
        const first = epErrors[0] as Record<string, unknown>;
        const message = (first?.detail ?? first?.title) as string | undefined;
        if (message) {
          toast.error(message);
          setIsAddingAll(false);
          return;
        }
      }
      toast.error(tProduct("addToCartFailed"));
    } finally {
      setIsAddingAll(false);
    }
  }, [pendingQtys, addItems, t, tProduct, enrichWithCustomInputs]);

  // Fetched on demand — see handleRequestMatrix — the first time a shopper
  // clicks "Show variants" on a given product, not eagerly for every
  // hasVariations product on the page.
  const handleRequestMatrix = useCallback((productId: string) => {
    if (fetchedParentIds.current.has(productId)) return;
    fetchedParentIds.current.add(productId);

    fetch(`/api/products/matrix?ids=${productId}`)
      .then((r) => r.json())
      .then((result: { parents?: Record<string, MatrixApiParent> }) => {
        const parent = (result.parents ?? {})[productId];
        if (!parent) return;
        setMatrixByParentId((prev) => {
          const next = new Map(prev);
          next.set(productId, {
            parentId: productId,
            parentName: parent.name,
            parentSku: parent.sku,
            parentPriceFormatted: parent.priceFormatted,
            children: parent.children,
          });
          return next;
        });
      })
      .catch(() => {
        // Leave this id un-cached — ProductCard's normal Quick View button
        // is the fallback whenever a hasVariations product has no matrix data.
        fetchedParentIds.current.delete(productId);
      });
  }, []);

  // Never actually invoked: ProductCard always renders MatrixCartRow with
  // bulkMode locked on, so every cell edit is staged via onPendingChange —
  // nothing ever auto-adds to cart from typing a quantity (see ProductCard's
  // handleAddMatrixToCart for the explicit "Add to cart" commit instead).
  const handleMatrixQuantityChange = useCallback(async () => {}, []);

  const handleMatrixBulkAdd = useCallback(
    async (items: Array<{ productId: string; quantity: number }>) => {
      try {
        await addItems(enrichWithCustomInputs(items));
      } catch {
        toast.error(tProduct("addToCartFailed"));
      }
    },
    [addItems, tProduct, enrichWithCustomInputs],
  );

  // Never actually invoked: MatrixCartRow only calls this for children
  // already present in cartItemsByProductId, which is always empty here.
  const handleMatrixBulkUpdate = useCallback(async () => {}, []);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 text-sm">{t("noResults")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBulkMode}
            aria-pressed={bulkMode}
            className={[
              "h-7 px-3 rounded-[6px] border text-[12px] font-semibold flex items-center gap-1.5 transition-colors",
              bulkMode
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-ink-200 text-ink-600 hover:text-ink-900",
            ].join(" ")}
          >
            <Layers size={13} />
            {t("bulkMode")}
          </button>
          <Button
            type="button"
            size="xs"
            onClick={handleAddAllToCart}
            disabled={
              !bulkMode || pendingCount === 0 || isAddingAll || isLoading
            }
          >
            {t("addAllToCart")}
            {bulkMode && pendingCount > 0 && (
              <span className="bg-white/20 text-white rounded-full px-1.5 text-[10px] font-bold leading-tight">
                {pendingCount}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-[3px] bg-ink-100 rounded-[8px] p-[3px]">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            title={t("viewList")}
            aria-pressed={viewMode === "list"}
            className={[
              "w-8 h-7 rounded-[6px] flex items-center justify-center transition-colors",
              viewMode === "list"
                ? "bg-white shadow-sm text-ink-900"
                : "text-ink-600 hover:text-ink-900",
            ].join(" ")}
          >
            <LayoutList size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title={t("viewGrid")}
            aria-pressed={viewMode === "grid"}
            className={[
              "w-8 h-7 rounded-[6px] flex items-center justify-center transition-colors",
              viewMode === "grid"
                ? "bg-white shadow-sm text-ink-900"
                : "text-ink-600 hover:text-ink-900",
            ].join(" ")}
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div
          className={[
            "grid grid-cols-1 sm:grid-cols-2 gap-6",
            // Full-width shells have room for more cards per row.
            fullWidth
              ? "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5"
              : "lg:grid-cols-3 xl:grid-cols-3",
          ].join(" ")}
        >
          {products.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              priority={i < 4}
              bulkMode={bulkMode}
              bulkQuantity={pendingQtys.get(product.id) ?? 0}
              onBulkQuantityChange={handleBulkQuantityChange}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product, i) => {
            const matrixGroup = product.hasVariations
              ? matrixByParentId.get(product.id)
              : undefined;

            return (
              <ProductCard
                key={product.id}
                product={product}
                lang={lang}
                priority={i < 4}
                variant="row"
                bulkMode={bulkMode}
                bulkQuantity={pendingQtys.get(product.id) ?? 0}
                onBulkQuantityChange={handleBulkQuantityChange}
                onRequestMatrix={
                  product.hasVariations ? handleRequestMatrix : undefined
                }
                matrix={
                  matrixGroup
                    ? {
                        group: matrixGroup,
                        pendingQtys,
                        onQuantityChange: handleMatrixQuantityChange,
                        onBulkAdd: handleMatrixBulkAdd,
                        onBulkUpdate: handleMatrixBulkUpdate,
                        disabled: isLoading,
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
