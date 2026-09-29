"use client";

import { useCallback, useRef, useState } from "react";
import { Package, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Price } from "@/components/product/Price";
import { VariantAddToCart } from "@/components/product/VariantAddToCart";
import { getProductByIdAction } from "@/lib/actions/product";
import type { KitProduct } from "@/lib/kit";

/**
 * Full-width kit product row — the Quick View layout inline on the page:
 * image + details on the left; a larger variation selector, live price, and
 * add to cart on the right. Product data comes from the kit response;
 * VariantAddToCart resolves the child from the variation matrix client-side,
 * and the resolved child's price is fetched on selection (same as Quick View).
 */
export function KitProductRow({
  product,
  lang,
}: {
  product: KitProduct;
  lang: string;
}) {
  const t = useTranslations("kit");

  // Price of the currently-resolved variation child (the kit response carries
  // no price, so it's fetched once per child and cached).
  const [variantPrice, setVariantPrice] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const priceCache = useRef<Map<string, string>>(new Map());

  const handleVariantResolved = useCallback(async (childId: string | null) => {
    if (!childId) {
      setVariantPrice(null);
      return;
    }
    const cached = priceCache.current.get(childId);
    if (cached !== undefined) {
      setVariantPrice(cached);
      return;
    }
    setPriceLoading(true);
    const child = await getProductByIdAction(childId);
    const price = child?.priceFormatted ?? "";
    priceCache.current.set(childId, price);
    setVariantPrice(price || null);
    setPriceLoading(false);
  }, []);

  const displayPrice = variantPrice ?? product.price ?? null;

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-ink-200 bg-white p-6 lg:flex-row">
      {/* Image */}
      <div className="flex h-48 w-48 shrink-0 items-center justify-center self-center rounded-lg border border-ink-100 bg-ink-50 p-3 lg:self-start">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <Package size={44} className="text-ink-300" />
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-xl font-bold text-ink-900">{product.name}</h3>
        {product.partNumber && (
          <p className="text-xs text-ink-500">
            {t("productCode")}:{" "}
            <span className="font-medium text-ink-700">
              {product.partNumber}
            </span>
          </p>
        )}
        {product.highlights?.length ? (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-600">
            {product.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        ) : (
          product.description && (
            <p className="text-sm text-ink-600">{product.description}</p>
          )
        )}
      </div>

      {/* Purchase panel — wider, with an enlarged variation selector */}
      <div className="flex w-full shrink-0 flex-col gap-4 lg:w-96">
        <div className="min-h-[2.5rem]">
          {priceLoading ? (
            <Loader2 size={22} className="animate-spin text-brand-primary" />
          ) : displayPrice ? (
            <>
              <Price formatted={displayPrice} className="text-3xl" />
              <p className="text-[11px] uppercase tracking-wide text-ink-500">
                {t("retailPrice")}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-500">{t("selectForPrice")}</p>
          )}
        </div>

        {/* Enlarge only the variation option pills (they carry aria-pressed),
            leaving the quantity/add-to-cart controls at their normal size. */}
        <div className="[&_button[aria-pressed]]:px-5 [&_button[aria-pressed]]:py-2.5 [&_button[aria-pressed]]:text-base">
          <VariantAddToCart
            productId={product.productId!}
            lang={lang}
            variations={product.variations}
            variationMatrix={product.variationMatrix}
            navigateOnSelect={false}
            onVariantResolved={handleVariantResolved}
            commodityType={product.commodityType}
          />
        </div>
      </div>
    </div>
  );
}
