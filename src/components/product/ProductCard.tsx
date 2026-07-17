"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductThumbnail } from "./ProductThumbnail";
import { ProductName } from "./ProductName";
import { Price } from "./Price";
import { QuantitySelector } from "./QuantitySelector";
import { AddToCart } from "./AddToCart";
import { QuantityAddToCart } from "./QuantityAddToCart";
import { QuickViewButton } from "./QuickViewButton";
import type { ProductCardData } from "@/lib/api/products";

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
}: ProductCardProps) {
  const t = useTranslations("product");

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
          {product.hasVariations || product.isBundle ? (
            <QuickViewButton product={product} lang={lang} />
          ) : (
            addToCartControl
          )}
        </div>
      </article>
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
