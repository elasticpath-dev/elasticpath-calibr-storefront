"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag, ChevronDown, ShoppingBag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductThumbnail } from "./ProductThumbnail";
import { ProductName } from "./ProductName";
import { Price } from "./Price";
import { QuantitySelector } from "./QuantitySelector";
import { AddToCart } from "./AddToCart";
import { QuantityAddToCart } from "./QuantityAddToCart";
import { QuickViewButton } from "./QuickViewButton";
import { MatrixCartRow } from "@/components/cart/MatrixCartRow";
import type { MatrixGroup } from "@/components/cart/types";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/lib/api/products";

const EMPTY_CART_ITEMS_MAP = new Map<string, { cartItemId: string; quantity: number }>();

type MatrixProps = {
  group: MatrixGroup;
  pendingQtys: Map<string, number>;
  onQuantityChange: (
    productId: string,
    cartItemId: string | null,
    newQty: number,
  ) => Promise<void>;
  onBulkAdd: (items: Array<{ productId: string; quantity: number }>) => Promise<void>;
  onBulkUpdate: (items: Array<{ cartItemId: string; quantity: number }>) => Promise<void>;
  disabled?: boolean;
};

type ProductCardProps = {
  product: ProductCardData;
  lang: string;
  priority?: boolean;
  variant?: "default" | "flat" | "row";
  /** Promotion label shown as a badge — only rendered in flat variant */
  promoInfo?: string;
  stackedPrice?: boolean;
  /**
   * When true, replaces the per-card Add to Cart control with a
   * quantity-only stepper reporting up to onBulkQuantityChange — adding to
   * cart happens once, in bulk, via a parent "Add all to cart" action
   * instead of per-card (see ProductGrid).
   */
  bulkMode?: boolean;
  bulkQuantity?: number;
  onBulkQuantityChange?: (productId: string, quantity: number) => void;
  /**
   * row variant only: when the product has variations and this is set, an
   * accordion toggle appears (instead of Quick View) that expands to show
   * the same parent/child variant matrix as the cart, below the card.
   */
  matrix?: MatrixProps;
  /** row variant only: called the first time a product's variants are shown, so the parent can lazily fetch its matrix data. */
  onRequestMatrix?: (productId: string) => void;
};

export function ProductCard({
  product,
  lang,
  priority = false,
  variant = "default",
  promoInfo,
  stackedPrice = false,
  bulkMode = false,
  bulkQuantity = 0,
  onBulkQuantityChange,
  matrix,
  onRequestMatrix,
}: ProductCardProps) {
  const t = useTranslations("product");
  const [showVariants, setShowVariants] = useState(false);
  const [isAddingMatrix, setIsAddingMatrix] = useState(false);

  const toggleVariants = () => {
    setShowVariants((prev) => {
      const next = !prev;
      if (next) onRequestMatrix?.(product.id);
      return next;
    });
  };

  // Matrix cells always stage into matrix.pendingQtys (never auto-add to
  // cart on typing) — this gathers this product's own pending children and
  // commits them in one call, then clears just this product's entries.
  const handleAddMatrixToCart = async () => {
    if (!matrix) return;
    const items = matrix.group.children
      .map((child) => ({
        productId: child.id,
        quantity: matrix.pendingQtys.get(child.id) ?? 0,
      }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) return;
    setIsAddingMatrix(true);
    try {
      await matrix.onBulkAdd(items);
      items.forEach((item) => onBulkQuantityChange?.(item.productId, 0));
    } finally {
      setIsAddingMatrix(false);
    }
  };

  const matrixPendingCount = matrix
    ? matrix.group.children.filter((c) => (matrix.pendingQtys.get(c.id) ?? 0) > 0).length
    : 0;

  const addToCartControl = bulkMode ? (
    <div className="flex items-center gap-2">
      <QuantitySelector
        value={bulkQuantity}
        onChange={(qty) => onBulkQuantityChange?.(product.id, qty)}
        min={0}
      />
      <AddToCart
        productId={product.id}
        quantity={bulkQuantity}
        disabled={bulkQuantity === 0}
        className="flex-1 justify-center h-9"
        // Once this product has been added individually, drop it back to 0
        // so it isn't also included the next time "Add all to cart" runs.
        onAdded={() => onBulkQuantityChange?.(product.id, 0)}
      />
    </div>
  ) : (
    <QuantityAddToCart productId={product.id} compact />
  );

  if (variant === "row") {
    const badges = [
      product.hasBulkBuy && { key: "bulk", label: t("bulkBuyTag") },
      product.hasVariations && { key: "variation", label: t("variationTag") },
      product.isBundle && { key: "bundle", label: t("bundleTag") },
      product.commodityType === "digital" && {
        key: "digital",
        label: t("digitalTag"),
        digital: true,
      },
    ].filter(
      (badge): badge is { key: string; label: string; digital?: boolean } =>
        !!badge,
    );

    return (
      <>
        <article className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-3 hover:shadow-md transition-shadow duration-200">
        <Link href={`/${lang}/products/${product.slug}`} className="flex-none">
          <ProductThumbnail
            imageUrl={product.imageUrl}
            name={product.name}
            priority={priority}
            className="w-20 h-20 rounded-lg"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/${lang}/products/${product.slug}`} className="block">
            <ProductName
              name={product.name}
              as="h3"
              className="text-sm hover:underline line-clamp-1"
            />
          </Link>
          {badges.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span
                  key={badge.key}
                  className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none border ${
                    badge.digital
                      ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                      : "text-red-700 bg-red-50 border-red-200"
                  }`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
          {product.description && (
            <p className="hidden sm:block mt-1 text-xs text-gray-500 line-clamp-1">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex-none flex items-center gap-4">
          <Price
            formatted={product.priceFormatted}
            originalFormatted={product.originalPriceFormatted}
            className="text-sm"
            stacked={stackedPrice}
          />
          {product.hasVariations ? (
            matrix || onRequestMatrix ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVariants}
                  aria-expanded={showVariants}
                  className={[
                    "h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors",
                    showVariants
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {showVariants ? t("hideVariants") : t("showVariants")}
                  <ChevronDown
                    size={14}
                    className={showVariants ? "rotate-180 transition-transform" : "transition-transform"}
                  />
                </button>
                {showVariants && matrix && (
                  <button
                    type="button"
                    onClick={handleAddMatrixToCart}
                    disabled={matrixPendingCount === 0 || isAddingMatrix}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-lg font-medium text-xs transition-all h-9 px-3",
                      "bg-brand-primary text-white hover:opacity-90 disabled:opacity-60",
                    )}
                  >
                    {isAddingMatrix ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ShoppingBag size={14} />
                    )}
                    {t("addToCart")}
                    {matrixPendingCount > 0 && (
                      <span className="bg-white/20 text-white rounded-full px-1.5 text-[10px] font-bold leading-tight">
                        {matrixPendingCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <QuickViewButton product={product} lang={lang} />
            )
          ) : product.isBundle ? (
            <QuickViewButton product={product} lang={lang} />
          ) : (
            addToCartControl
          )}
        </div>
      </article>

      {product.hasVariations && matrix && showVariants && (
        <div className="mt-2">
          <MatrixCartRow
            matrixGroup={matrix.group}
            cartItemsByProductId={EMPTY_CART_ITEMS_MAP}
            onQuantityChange={matrix.onQuantityChange}
            onBulkAdd={matrix.onBulkAdd}
            onBulkUpdate={matrix.onBulkUpdate}
            // Locked on regardless of the page's bulkMode: every cell edit
            // stages into pendingQtys, never auto-adding to cart — committing
            // happens only via the explicit "Add to cart" button above (or
            // the page-level "Add all to cart" when bulk mode is enabled).
            bulkMode
            pendingQtys={matrix.pendingQtys}
            onPendingChange={onBulkQuantityChange}
            disabled={matrix.disabled}
          />
        </div>
      )}
    </>
    );
  }

  if (variant === "flat") {
    return (
      <article className="group flex flex-col h-full rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow duration-200">
        <Link
          href={`/${lang}/products/${product.slug}`}
          className="relative block"
        >
          <ProductThumbnail
            imageUrl={product.imageUrl}
            name={product.name}
            priority={priority}
          />
        </Link>

        <div className="p-3 flex flex-col gap-2 flex-1">
          <Link href={`/${lang}/products/${product.slug}`} className="block">
            <ProductName
              name={product.name}
              as="h3"
              className="text-xs hover:underline line-clamp-2"
            />
          </Link>

          <Price
            formatted={product.priceFormatted}
            originalFormatted={product.originalPriceFormatted}
            className="text-sm"
            stacked={stackedPrice}
          />

          {promoInfo && (
            <span className="inline-flex items-center gap-1 self-start text-[10px] font-semibold text-success-600 bg-success-50 border border-success-200 rounded-full px-2 py-0.5 leading-none">
              <Tag className="h-2.5 w-2.5 flex-none" />
              {promoInfo}
            </span>
          )}

          <div className="mt-auto pt-1">
            {product.hasVariations ? (
              <QuickViewButton product={product} lang={lang} />
            ) : (
              addToCartControl
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col h-full rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow duration-200">
      <Link
        href={`/${lang}/products/${product.slug}`}
        className="relative block"
      >
        <ProductThumbnail
          imageUrl={product.imageUrl}
          name={product.name}
          priority={priority}
        />
        {[
          product.hasBulkBuy && {
            key: "bulk",
            label: t("bulkBuyTag"),
            className: "bg-red-600",
          },
          product.hasVariations && {
            key: "variation",
            label: t("variationTag"),
            className: "bg-red-600",
          },
          product.isBundle && {
            key: "bundle",
            label: t("bundleTag"),
            className: "bg-red-600",
          },
          product.commodityType === "digital" && {
            key: "digital",
            label: t("digitalTag"),
            className: "bg-indigo-600",
          },
        ]
          .filter(
            (
              badge,
            ): badge is { key: string; label: string; className: string } =>
              !!badge,
          )
          .map((badge, i) => (
            <span
              key={badge.key}
              className={`absolute left-2 rounded-md px-2 py-0.5 text-xs font-semibold text-white ${badge.className}`}
              style={{ top: `${0.5 + i * 1.5}rem` }}
            >
              {badge.label}
            </span>
          ))}
      </Link>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <Link href={`/${lang}/products/${product.slug}`} className="block">
          <ProductName
            name={product.name}
            as="h3"
            className="text-sm hover:underline line-clamp-3"
          />
        </Link>

        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-1">
            {product.description}
          </p>
        )}

        {product.hasVariations || product.isBundle ? (
          <div className="flex items-center justify-between mt-auto pt-2">
            <Price
              formatted={product.priceFormatted}
              originalFormatted={product.originalPriceFormatted}
              className="text-base"
              stacked={stackedPrice}
            />
            <QuickViewButton product={product} lang={lang} />
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-auto pt-2">
            <Price
              formatted={product.priceFormatted}
              originalFormatted={product.originalPriceFormatted}
              className="text-base"
              stacked={stackedPrice}
            />
            {addToCartControl}
          </div>
        )}
      </div>
    </article>
  );
}
