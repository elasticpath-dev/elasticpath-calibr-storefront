"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { ShoppingBag, LayoutList, LayoutGrid, Layers, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { Button } from "@/components/ui/Button";
import { CartPageHeader } from "./CartPageHeader";
import { CartSummaryPanel } from "./CartSummaryPanel";
import { BundleCartRow } from "./BundleCartRow";
import { BundleCartRowList } from "./BundleCartRowList";
import { MatrixCartRow } from "./MatrixCartRow";
import { SimpleCartRow } from "./SimpleCartRow";
import { SimpleCartRowList } from "./SimpleCartRowList";
import { PromotionCarousel } from "./PromotionCarousel";
import type {
  LineGroup,
  ProductInfo,
  ChildProduct,
  CartItemEntry,
} from "./types";
import type { PromotionSuggestion } from "@/context/CartContext";
import { Tag } from "lucide-react";
import {
  getCartGroupValues,
  cartGroupKey,
  type GroupableCartItem,
  type CartGroupValue,
} from "@/lib/cart-grouping";

/** Stable React key for a line group (matrix keyed by parent, else cart item). */
function lineGroupKey(group: LineGroup): string {
  return group.kind === "matrix" ? group.matrixGroup.parentId : group.cartItemId;
}

/** Greyed, collapsible title bar above a cart group's items (see the grouped
 * itemsColumn). Clicking it expands/collapses the group. */
function CartGroupHeader({
  values,
  expanded,
  onToggle,
  itemsLabel,
}: {
  values: CartGroupValue[];
  expanded: boolean;
  onToggle: () => void;
  itemsLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="w-full flex items-center gap-3 rounded-[10px] bg-ink-50 border border-ink-200 px-4 py-2.5 text-left hover:bg-ink-100 transition-colors"
    >
      <ChevronDown
        size={16}
        className={`flex-none text-ink-500 transition-transform ${expanded ? "" : "-rotate-90"}`}
      />
      <span className="flex-1 flex items-center gap-x-5 gap-y-1 flex-wrap min-w-0">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[13px]">
            <span className="text-ink-500 font-medium">{v.label}:</span>
            <span className="text-ink-900 font-semibold">{v.value || "—"}</span>
          </span>
        ))}
      </span>
      <span className="flex-none text-[12px] text-ink-500">{itemsLabel}</span>
    </button>
  );
}

function OffersSection({
  promotionSuggestions,
  lang,
  t,
}: {
  promotionSuggestions: PromotionSuggestion[] | null;
  lang: string;
  t: (key: string) => string;
}) {
  if (!promotionSuggestions?.length) return null;

  return (
    <div className="bg-white border border-ink-200 rounded-[16px] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Tag size={15} className="text-success-600 flex-none" />
        <h3 className="text-[14px] font-semibold text-ink-900">{t("offersForYou")}</h3>
      </div>
      <p className="text-[12px] text-ink-600">{t("offersEmpty")}</p>
      <PromotionCarousel suggestions={promotionSuggestions} lang={lang} flat />
    </div>
  );
}

const COOKIE_KEY = "cart_view_mode";

function readViewModeCookie(defaultMode: "list" | "grid"): "list" | "grid" {
  if (typeof document === "undefined") return defaultMode;
  const match = document.cookie.match(/(?:^|;\s*)cart_view_mode=([^;]*)/);
  const val = match?.[1];
  return val === "list" || val === "grid" ? val : defaultMode;
}

function writeViewModeCookie(mode: "list" | "grid") {
  document.cookie = `${COOKIE_KEY}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

type Props = { lang: string };

export function B2BCartContent({ lang }: Props) {
  const t = useTranslations("cart");
  const { items, isLoading, isInitializing, addItem, addItems, bulkUpdateItems, updateQuantity, removeItem, promotionSuggestions } = useCart();
  const { cartViewMode, cartGroupBy } = useTenantConfig();

  const productInfoCache = useRef<Map<string, ProductInfo>>(new Map());
  const childrenCache = useRef<Map<string, ChildProduct[]>>(new Map());

  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [viewMode, setViewModeState] = useState<"list" | "grid">(cartViewMode);
  const [bulkMode, setBulkMode] = useState(false);
  const [pendingQtys, setPendingQtys] = useState<Map<string, number>>(new Map());
  const [simplePendingQtys, setSimplePendingQtys] = useState<Map<string, number>>(new Map());
  // Collapsed cart groups (by group key). Groups are expanded by default.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Sync from cookie after hydration
  useEffect(() => {
    const saved = readViewModeCookie(cartViewMode);
    if (saved !== viewMode) setViewModeState(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setViewMode = useCallback((mode: "list" | "grid") => {
    writeViewModeCookie(mode);
    setViewModeState(mode);
    if (mode === "list") {
      setBulkMode(false);
      setPendingQtys(new Map());
      setSimplePendingQtys(new Map());
    }
  }, []);

  const handlePendingChange = useCallback((productId: string, quantity: number) => {
    setPendingQtys((prev) => new Map(prev).set(productId, quantity));
  }, []);

  const handleSimplePendingChange = useCallback((cartItemId: string, qty: number) => {
    setSimplePendingQtys((prev) => new Map(prev).set(cartItemId, qty));
  }, []);

  const pendingCount = useMemo(() => {
    let count = 0;
    for (const [productId, pendingQty] of pendingQtys) {
      let currentQty = 0;
      for (const group of groups) {
        if (group.kind !== "matrix") continue;
        const entry = (group as Extract<LineGroup, { kind: "matrix" }>).cartItemsByProductId.get(productId);
        if (entry) { currentQty = entry.quantity; break; }
      }
      if (pendingQty !== currentQty) count++;
    }
    for (const [cartItemId, pendingQty] of simplePendingQtys) {
      for (const group of groups) {
        if (group.kind !== "simple") continue;
        if ((group as Extract<LineGroup, { kind: "simple" }>).cartItemId === cartItemId) {
          if (pendingQty !== (group as Extract<LineGroup, { kind: "simple" }>).quantity) count++;
          break;
        }
      }
    }
    return count;
  }, [pendingQtys, simplePendingQtys, groups]);

  const rebuild = useCallback(async () => {
    setGroupsLoading(true);

    // List mode: skip API calls, map items directly to simple/bundle rows
    if (viewMode === "list") {
      const lineGroups: LineGroup[] = items.map((item) => {
        if (item.bundleComponents && item.bundleComponents.length > 0) {
          return {
            kind: "bundle" as const,
            cartItemId: item.id,
            name: item.name,
            sku: item.sku,
            slug: item.slug,
            quantity: item.quantity,
            unitPrice: item.unitPriceFormatted,
            lineTotal: item.lineTotalFormatted,
            imageUrl: item.imageHref,
            bundleComponents: item.bundleComponents,
            customInputs: item.customInputs,
          };
        }
        return {
          kind: "simple" as const,
          cartItemId: item.id,
          name: item.name,
          sku: item.sku,
          slug: item.slug,
          quantity: item.quantity,
          unitPrice: item.unitPriceFormatted,
          unitPriceAmount: item.unitPriceAmount,
          lineTotal: item.lineTotalFormatted,
          lineTotalOriginal: item.lineTotalOriginalFormatted,
          imageUrl: item.imageHref,
          discounts: item.discounts,
          isSubscription: item.isSubscription,
          subscriptionPlanName: item.subscriptionPlanName,
          subscriptionFrequency: item.subscriptionFrequency,
          isFreeGift: item.isFreeGift,
          productFields: item.productFields,
          customInputs: item.customInputs,
        };
      });
      setGroups(lineGroups);
      setGroupsLoading(false);
      return;
    }

    // 1. Collect parent IDs from custom_inputs — only these items are treated as child products
    const parentIds = new Set<string>();
    for (const item of items) {
      const pid = item.customInputs?.parent_product_id;
      if (pid) parentIds.add(pid);
    }

    // 2. Fetch parent header info (name/sku/price) and derive every child's
    //    variation options from meta.variation_matrix/meta.variations, all
    //    in a single batched call — no per-parent /children requests.
    const newParentIds = Array.from(parentIds).filter(
      (id) => !productInfoCache.current.has(id),
    );
    if (newParentIds.length > 0) {
      const result = await fetch(
        `/api/products/matrix?ids=${newParentIds.join(",")}`,
      )
        .then((r) => r.json())
        .catch(() => ({ parents: {} }));
      const parents = result.parents ?? {};
      newParentIds.forEach((id) => {
        const parent = parents[id];
        if (!parent) return;
        productInfoCache.current.set(id, {
          id: parent.id,
          name: parent.name,
          sku: parent.sku,
          priceFormatted: parent.priceFormatted,
          productType: "parent",
        });
        childrenCache.current.set(id, parent.children ?? []);
      });
    }

    // 4. Build line groups
    const seenParents = new Set<string>();
    const lineGroups: LineGroup[] = [];

    for (const item of items) {
      // Bundle — embedded component data takes priority
      if (item.bundleComponents && item.bundleComponents.length > 0) {
        lineGroups.push({
          kind: "bundle",
          cartItemId: item.id,
          name: item.name,
          sku: item.sku,
          slug: item.slug,
          quantity: item.quantity,
          unitPrice: item.unitPriceFormatted,
          lineTotal: item.lineTotalFormatted,
          imageUrl: item.imageHref,
          bundleComponents: item.bundleComponents,
            customInputs: item.customInputs,
        });
        continue;
      }

      // Child product — only when parent_product_id is in custom_inputs
      const parentId = item.customInputs?.parent_product_id;
      if (parentId) {
        if (!seenParents.has(parentId)) {
          seenParents.add(parentId);
          const parentInfo = productInfoCache.current.get(parentId);
          const children = childrenCache.current.get(parentId) ?? [];

          // Gather all sibling cart items for this parent
          const siblingCartItems: Map<string, CartItemEntry> = new Map();
          for (const si of items) {
            if (si.customInputs?.parent_product_id === parentId) {
              siblingCartItems.set(si.productId, {
                cartItemId: si.id,
                quantity: si.quantity,
              });
            }
          }

          lineGroups.push({
            kind: "matrix",
            matrixGroup: {
              parentId,
              parentName: parentInfo?.name ?? item.name,
              parentSku: parentInfo?.sku ?? undefined,
              parentPriceFormatted: parentInfo?.priceFormatted,
              children,
            },
            cartItemsByProductId: siblingCartItems,
          });
        }
        continue;
      }

      // Simple product
      lineGroups.push({
        kind: "simple",
        cartItemId: item.id,
        name: item.name,
        sku: item.sku,
        slug: item.slug,
        quantity: item.quantity,
        unitPrice: item.unitPriceFormatted,
        unitPriceAmount: item.unitPriceAmount,
        lineTotal: item.lineTotalFormatted,
        lineTotalOriginal: item.lineTotalOriginalFormatted,
        imageUrl: item.imageHref,
        discounts: item.discounts,
        isSubscription: item.isSubscription,
        subscriptionPlanName: item.subscriptionPlanName,
        subscriptionFrequency: item.subscriptionFrequency,
        isFreeGift: item.isFreeGift,
        productFields: item.productFields,
          customInputs: item.customInputs,
      });
    }

    setGroups(lineGroups);
    setGroupsLoading(false);
  }, [items, viewMode]);

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  const showCartError = useCallback(
    (err: unknown) => {
      const epErrors = (err as Record<string, unknown>)?.errors;
      if (Array.isArray(epErrors) && epErrors.length > 0) {
        const first = epErrors[0] as Record<string, unknown>;
        const message = (first?.detail ?? first?.title) as string | undefined;
        if (message) { toast.error(message); return; }
      }
      toast.error(t("addToCartFailed"));
    },
    [t],
  );

  const handleMatrixQtyChange = useCallback(
    async (productId: string, cartItemId: string | null, newQty: number) => {
      try {
        if (newQty <= 0 && cartItemId) {
          await removeItem(cartItemId);
        } else if (newQty > 0 && !cartItemId) {
          // Find the child in the cache to build custom_inputs
          let customInputs: Record<string, string> | undefined;
          for (const [parentId, children] of childrenCache.current) {
            const child = children.find((c) => c.id === productId);
            if (child && child.variationOptions.length > 0) {
              customInputs = {
                parent_product_id: parentId,
                options: child.variationOptions
                  .map((o) => o.optionName)
                  .join(" / "),
              };
              break;
            }
          }
          await addItem(productId, newQty, customInputs);
        } else if (newQty > 0 && cartItemId) {
          await updateQuantity(cartItemId, newQty);
        }
      } catch (err) {
        showCartError(err);
      }
    },
    [addItem, updateQuantity, removeItem, showCartError],
  );

  const handleMatrixBulkAdd = useCallback(
    async (items: Array<{ productId: string; quantity: number }>) => {
      try {
        const enriched = items.map(({ productId, quantity }) => {
          let customInputs: Record<string, string> | undefined;
          for (const [parentId, children] of childrenCache.current) {
            const child = children.find((c) => c.id === productId);
            if (child && child.variationOptions.length > 0) {
              customInputs = {
                parent_product_id: parentId,
                options: child.variationOptions.map((o) => o.optionName).join(" / "),
              };
              break;
            }
          }
          return { productId, quantity, customInputs };
        });
        await addItems(enriched);
      } catch (err) {
        showCartError(err);
      }
    },
    [addItems, showCartError],
  );

  const handleMatrixBulkUpdate = useCallback(
    async (items: Array<{ cartItemId: string; quantity: number }>) => {
      try {
        // One bulk call for everything — quantity 0 removes the item.
        await bulkUpdateItems(items);
      } catch (err) {
        showCartError(err);
      }
    },
    [bulkUpdateItems, showCartError],
  );

  const handleCartUpdateAll = useCallback(async () => {
    const additions: Array<{ productId: string; quantity: number }> = [];
    const mutations: Array<{ cartItemId: string; quantity: number }> = [];

    for (const [productId, pendingQty] of pendingQtys) {
      let cartEntry: CartItemEntry | undefined;
      for (const group of groups) {
        if (group.kind !== "matrix") continue;
        cartEntry = (group as Extract<LineGroup, { kind: "matrix" }>).cartItemsByProductId.get(productId);
        if (cartEntry) break;
      }
      const currentQty = cartEntry?.quantity ?? 0;
      if (pendingQty === currentQty) continue;
      if (pendingQty > 0 && !cartEntry) {
        additions.push({ productId, quantity: pendingQty });
      } else if (cartEntry) {
        mutations.push({ cartItemId: cartEntry.cartItemId, quantity: pendingQty });
      }
    }

    for (const [cartItemId, pendingQty] of simplePendingQtys) {
      for (const group of groups) {
        if (group.kind !== "simple") continue;
        const sg = group as Extract<LineGroup, { kind: "simple" }>;
        if (sg.cartItemId === cartItemId && pendingQty !== sg.quantity) {
          mutations.push({ cartItemId, quantity: pendingQty });
          break;
        }
      }
    }

    if (additions.length > 0) await handleMatrixBulkAdd(additions);
    if (mutations.length > 0) await handleMatrixBulkUpdate(mutations);
    setPendingQtys(new Map());
    setSimplePendingQtys(new Map());
  }, [pendingQtys, simplePendingQtys, groups, handleMatrixBulkAdd, handleMatrixBulkUpdate]);

  const handleSimpleQtyChange = useCallback(
    async (cartItemId: string, qty: number) => {
      try {
        if (qty <= 0) await removeItem(cartItemId);
        else await updateQuantity(cartItemId, qty);
      } catch (err) {
        showCartError(err);
      }
    },
    [updateQuantity, removeItem, showCartError],
  );

  // ── Grouping by configured cart line-item fields (ui.cartGroupBy) ──────────
  const itemById = useMemo(() => {
    const map = new Map<string, (typeof items)[number]>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  // The source cart item a line group draws its grouping values from. Matrix
  // groups aggregate several child items; they share the parent's grouping
  // fields (e.g. the same PO), so the first child represents the group.
  const groupRepItem = useCallback(
    (group: LineGroup): GroupableCartItem => {
      if (group.kind === "matrix") {
        return (
          items.find(
            (i) => i.customInputs?.parent_product_id === group.matrixGroup.parentId,
          ) ?? {}
        );
      }
      return itemById.get(group.cartItemId) ?? {};
    },
    [items, itemById],
  );

  const groupedLineGroups = useMemo(() => {
    if (cartGroupBy.length === 0) return null;
    const byKey = new Map<
      string,
      { key: string; values: CartGroupValue[]; isEmpty: boolean; lineGroups: LineGroup[] }
    >();
    for (const group of groups) {
      const item = groupRepItem(group);
      const key = cartGroupKey(item, cartGroupBy);
      let bucket = byKey.get(key);
      if (!bucket) {
        const values = getCartGroupValues(item, cartGroupBy);
        bucket = {
          key,
          values,
          isEmpty: values.every((v) => v.value === ""),
          lineGroups: [],
        };
        byKey.set(key, bucket);
      }
      bucket.lineGroups.push(group);
    }
    return [...byKey.values()];
  }, [groups, cartGroupBy, groupRepItem]);

  // Show headers when grouping is configured and there's something to label —
  // i.e. not just a single group whose items all lack the fields.
  const showGroupHeaders =
    !!groupedLineGroups &&
    (groupedLineGroups.length > 1 || !groupedLineGroups[0]?.isEmpty);

  // One line group → its row, using the components that match the active view.
  const renderRow = useCallback(
    (group: LineGroup) => {
      if (group.kind === "bundle") {
        return viewMode === "list" ? (
          <BundleCartRowList
            lang={lang}
            key={group.cartItemId}
            {...group}
            onQuantityChange={handleSimpleQtyChange}
            onRemove={removeItem}
            disabled={isLoading}
          />
        ) : (
          <BundleCartRow
            lang={lang}
            key={group.cartItemId}
            {...group}
            onQuantityChange={handleSimpleQtyChange}
            onRemove={removeItem}
            disabled={isLoading}
          />
        );
      }
      if (group.kind === "matrix") {
        return (
          <MatrixCartRow
            key={group.matrixGroup.parentId}
            matrixGroup={group.matrixGroup}
            cartItemsByProductId={group.cartItemsByProductId}
            onQuantityChange={handleMatrixQtyChange}
            onBulkAdd={handleMatrixBulkAdd}
            onBulkUpdate={handleMatrixBulkUpdate}
            {...(viewMode === "grid"
              ? { bulkMode, pendingQtys, onPendingChange: handlePendingChange }
              : {})}
            disabled={isLoading}
          />
        );
      }
      return viewMode === "list" ? (
        <SimpleCartRowList
          lang={lang}
          key={group.cartItemId}
          {...group}
          onQuantityChange={handleSimpleQtyChange}
          onRemove={removeItem}
          disabled={isLoading}
        />
      ) : (
        <SimpleCartRow
          lang={lang}
          key={group.cartItemId}
          {...group}
          onQuantityChange={handleSimpleQtyChange}
          onRemove={removeItem}
          disabled={isLoading}
          bulkMode={bulkMode}
          pendingQty={simplePendingQtys.get(group.cartItemId)}
          onPendingChange={handleSimplePendingChange}
        />
      );
    },
    [
      viewMode,
      lang,
      isLoading,
      bulkMode,
      pendingQtys,
      simplePendingQtys,
      handleSimpleQtyChange,
      handleMatrixQtyChange,
      handleMatrixBulkAdd,
      handleMatrixBulkUpdate,
      handlePendingChange,
      handleSimplePendingChange,
      removeItem,
    ],
  );

    const itemsColumn =
    showGroupHeaders && groupedLineGroups ? (
      <div className="flex flex-col gap-7">
        {groupedLineGroups.map((bucket) => {
          const groupKey = bucket.key || "__ungrouped__";
          const expanded = !collapsedGroups.has(groupKey);
          return (
          <div key={groupKey} className="flex flex-col">
            <CartGroupHeader
              values={bucket.values}
              expanded={expanded}
              onToggle={() => toggleGroup(groupKey)}
              itemsLabel={t("products", { count: bucket.lineGroups.length })}
            />
            {expanded && (
            // Tree connector: a rail drops from the header, and a bold elbow
            // with an arrowhead branches into each item card (in the left
            // gutter created by pl-12). The rail is full-height for each row
            // except the last, which stops at the elbow → a └. Vertical center
            // is offset by +6px to hit the card's centre past pt-3.
            <div>
              {bucket.lineGroups.map((group, i) => {
                const isLast = i === bucket.lineGroups.length - 1;
                const center = "calc(50% + 6px)";
                return (
                  <div key={lineGroupKey(group)} className="relative pl-12 pt-3">
                    {/* vertical rail */}
                    <span
                      aria-hidden
                      className="absolute left-5 w-0.5 bg-ink-300"
                      style={{ top: 0, ...(isLast ? { height: center } : { bottom: 0 }) }}
                    />
                    {/* horizontal elbow */}
                    <span
                      aria-hidden
                      className="absolute left-5 h-0.5 w-4 bg-ink-300"
                      style={{ top: center, transform: "translateY(-50%)" }}
                    />
                    {/* arrowhead into the card */}
                    <ChevronRight
                      aria-hidden
                      size={18}
                      strokeWidth={3}
                      className="absolute left-[30px] text-ink-300"
                      style={{ top: center, transform: "translateY(-50%)" }}
                    />
                    {renderRow(group)}
                  </div>
                );
              })}
            </div>
            )}
          </div>
          );
        })}
      </div>
    ) : (
      <div className="flex flex-col gap-4">{groups.map(renderRow)}</div>
    );

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const lineCount = groups.length;

  const isLoadingState = isInitializing || (groupsLoading && groups.length === 0);
  const isEmpty = !isInitializing && !isLoading && !groupsLoading && items.length === 0;

  return (
    <div className="container-shell px-4 sm:px-6 lg:px-8 py-[30px] pb-20">
      <CartPageHeader
        lang={lang}
        totalUnits={totalUnits}
        lineCount={lineCount}
        showActions={viewMode === "grid"}
      />

      <div className="h-px bg-ink-200 my-7" />

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-20 h-20 rounded-full bg-ink-100 flex items-center justify-center">
            <ShoppingBag size={36} className="text-ink-300" />
          </div>
          <div className="text-center">
            <p className="text-[18px] font-semibold text-ink-900">
              {t("emptyTitle")}
            </p>
            <p className="text-[14px] text-ink-600 mt-1">{t("emptyHint")}</p>
          </div>
          <Link
            href={`/${lang}`}
            className="mt-2 h-11 px-6 rounded-[11px] bg-ink-900 text-white font-semibold text-[14px] flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            {t("browseCatalog")}
          </Link>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* View toggle toolbar — hidden while loading to avoid "0 units" flash */}
          {!isLoadingState && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] text-ink-600">
                {t("units", { count: totalUnits })} ·{" "}
                {t("products", { count: lineCount })}
              </p>
              <div className="flex items-center gap-2">
                {viewMode === "grid" && (
                  <>
                    <button
                      onClick={() => setBulkMode((v) => !v)}
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
                    {bulkMode && pendingCount > 0 && (
                      <Button
                        type="button"
                        size="xs"
                        onClick={handleCartUpdateAll}
                        disabled={isLoading}
                      >
                        {t("updateAll")}
                        <span className="bg-white/20 text-white rounded-full px-1.5 text-[10px] font-bold leading-tight">
                          {pendingCount}
                        </span>
                      </Button>
                    )}
                  </>
                )}
                <div className="flex items-center gap-[3px] bg-ink-100 rounded-[8px] p-[3px]">
                  <button
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
            </div>
          )}

          {/* Shared skeleton — shown during initial load and subsequent fetches */}
          {isLoadingState && (
            <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-8 lg:items-start">
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-white border border-ink-200 animate-pulse" />
                ))}
              </div>
              <div className="mt-6 lg:mt-0 flex flex-col gap-4">
                <div className="h-64 rounded-2xl bg-white border border-ink-200 animate-pulse" />
              </div>
            </div>
          )}

          {/* List view: two-column layout with summary sidebar */}
          {!isLoadingState && viewMode === "list" && (
            <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-8 lg:items-start">
              {/* Left: items (grouped by cartGroupBy when configured) */}
              {itemsColumn}

              {/* Right: sticky order summary + offers section */}
              <div className="mt-6 lg:mt-0 lg:sticky lg:top-24 flex flex-col gap-4">
                <CartSummaryPanel lang={lang} lineCount={lineCount} totalUnits={totalUnits} />
                <OffersSection promotionSuggestions={promotionSuggestions} lang={lang} t={t} />
              </div>
            </div>
          )}

          {/* Grid view: full-width single-column, totals shown in header */}
          {!isLoadingState && viewMode === "grid" && (
            <>
              {/* Items (grouped by cartGroupBy when configured) */}
              {itemsColumn}
              <div className="mt-6">
                <OffersSection promotionSuggestions={promotionSuggestions} lang={lang} t={t} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
