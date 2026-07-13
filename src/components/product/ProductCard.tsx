"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductThumbnail } from "./ProductThumbnail";
import { ProductName } from "./ProductName";
import { Price } from "./Price";
import { AddToCart } from "./AddToCart";
import { QuickViewButton } from "./QuickViewButton";
import type { ProductCardData } from "@/lib/api/products";

type ProductCardProps = {
  product: ProductCardData;
  lang: string;
  priority?: boolean;
  variant?: "default" | "flat";
  /** Promotion label shown as a badge — only rendered in flat variant */
  promoInfo?: string;
  stackedPrice?: boolean;
};

export function ProductCard({
  product,
  lang,
  priority = false,
  variant = "default",
  promoInfo,
  stackedPrice = false,
}: ProductCardProps) {
  const t = useTranslations("product");

  if (variant === "flat") {
    return (
      <article className="group flex flex-col h-full rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow duration-200">
        <Link href={`/${lang}/products/${product.slug}`} className="relative block">
          <ProductThumbnail imageUrl={product.imageUrl} name={product.name} priority={priority} />
        </Link>

        <div className="p-3 flex flex-col gap-2 flex-1">
          <Link href={`/${lang}/products/${product.slug}`} className="block">
            <ProductName name={product.name} as="h3" className="text-xs hover:underline line-clamp-2" />
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
              <AddToCart productId={product.id} variant="full" className="py-2 text-xs" />
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col h-full rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow duration-200">
      <Link href={`/${lang}/products/${product.slug}`} className="relative block">
        <ProductThumbnail
          imageUrl={product.imageUrl}
          name={product.name}
          priority={priority}
        />
        {[
          product.hasBulkBuy && { key: "bulk", label: t("bulkBuyTag"), className: "bg-red-600" },
          product.hasVariations && { key: "variation", label: t("variationTag"), className: "bg-red-600" },
          product.isBundle && { key: "bundle", label: t("bundleTag"), className: "bg-red-600" },
          product.commodityType === "digital" && { key: "digital", label: t("digitalTag"), className: "bg-indigo-600" },
        ]
          .filter((badge): badge is { key: string; label: string; className: string } => !!badge)
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
          <ProductName name={product.name} as="h3" className="text-sm hover:underline line-clamp-3" />
        </Link>

        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <Price formatted={product.priceFormatted} originalFormatted={product.originalPriceFormatted} className="text-base" stacked={stackedPrice} />
          {product.hasVariations || product.isBundle ? (
            <QuickViewButton product={product} lang={lang} />
          ) : (
            <AddToCart productId={product.id} />
          )}
        </div>
      </div>
    </article>
  );
}
