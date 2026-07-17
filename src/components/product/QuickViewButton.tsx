"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Eye, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ProductThumbnail } from "./ProductThumbnail";
import { ProductName } from "./ProductName";
import { Price } from "./Price";
import { VariantAddToCart } from "./VariantAddToCart";
import { BundleConfigurator } from "./BundleConfigurator";
import { getProductBySlugAction, getProductByIdAction } from "@/lib/actions/product";
import type { ProductCardData, ProductDetailData } from "@/lib/api/products";
import { SubscriptionProductActions } from "./SubscriptionProductActions";
import type { ProductOffering } from "@/lib/api/subscriptions";

type ChildOverride = Pick<
  ProductDetailData,
  "imageUrl" | "priceFormatted" | "originalPriceFormatted" | "description"
>;

type Props = {
  product: ProductCardData;
  lang: string;
};

export function QuickViewButton({ product, lang }: Props) {
  const t = useTranslations("product");
  const [isOpen, setIsOpen] = useState(false);
  const [detail, setDetail] = useState<ProductDetailData | null>(null);
  const [offering, setOffering] = useState<ProductOffering | null>(null);
  const [loading, setLoading] = useState(false);
  const [childOverride, setChildOverride] = useState<ChildOverride | null>(null);
  const [childLoading, setChildLoading] = useState(false);
  const childCache = useRef<Map<string, ChildOverride>>(new Map());

  const handleOpen = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(true);
      setChildOverride(null);
      if (!detail) {
        setLoading(true);
        const [data, offeringData] = await Promise.all([
          getProductBySlugAction(product.slug),
          fetch(`/api/subscriptions/${product.id}`).then((r) => r.json()).catch(() => null),
        ]);
        setDetail(data);
        setOffering(offeringData ?? null);
        setLoading(false);
      }
    },
    [detail, product.slug],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setChildOverride(null);
  }, []);

  const handleVariantResolved = useCallback(async (childId: string | null) => {
    if (!childId) {
      setChildOverride(null);
      return;
    }

    if (childCache.current.has(childId)) {
      setChildOverride(childCache.current.get(childId)!);
      return;
    }

    setChildLoading(true);
    const childData = await getProductByIdAction(childId);
    if (childData) {
      const override: ChildOverride = {
        imageUrl: childData.imageUrl,
        priceFormatted: childData.priceFormatted,
        originalPriceFormatted: childData.originalPriceFormatted,
        description: childData.description,
      };
      childCache.current.set(childId, override);
      setChildOverride(override);
    }
    setChildLoading(false);
  }, []);

  const displayImageUrl = childOverride?.imageUrl ?? detail?.imageUrl;
  const displayPrice = childOverride?.priceFormatted ?? detail?.priceFormatted ?? "";
  const displayOriginalPrice = childOverride?.originalPriceFormatted ?? detail?.originalPriceFormatted;
  const displayDescription = childOverride?.description ?? detail?.description;

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs font-medium bg-brand-primary text-white hover:opacity-90 transition-opacity"
      >
        <Eye size={14} />
        {t("quickView")}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="full"
        className="max-w-5xl"
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          </div>
        ) : detail?.isBundle && detail.components?.length ? (
          <div className="flex flex-col overflow-y-auto overflow-x-hidden max-h-[75vh]">
            {/* Top: image + name/description */}
            <div className="flex gap-6 shrink-0 mb-4">
              <div className="w-40 h-40 shrink-0 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                <ProductThumbnail
                  imageUrl={detail.imageUrl}
                  name={detail.name}
                  className="w-full h-full"
                  priority
                />
              </div>
              <div className="flex flex-col gap-1 justify-center">
                <ProductName name={detail.name} as="h2" className="text-xl" />
                {detail.description && (
                  <p className="text-sm text-gray-600 line-clamp-3">{detail.description}</p>
                )}
              </div>
            </div>
            {/* Full-width configurator with sticky footer */}
            <BundleConfigurator
              productId={detail.id}
              components={detail.components}
              initialPrice={detail.priceFormatted}
              initialOriginalPrice={detail.originalPriceFormatted}
              stickyFooter
            />
          </div>
        ) : detail ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Image with loading overlay on child fetch */}
            <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              <ProductThumbnail
                imageUrl={displayImageUrl}
                name={detail.name}
                className="w-full aspect-square"
                priority
              />
              {childLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Loader2 size={28} className="animate-spin text-brand-primary" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <ProductName name={detail.name} as="h2" className="text-xl" />

              {!childOverride && offering ? (
                <SubscriptionProductActions
                  offering={offering}
                  oneTimePrice={displayPrice}
                  originalPrice={displayOriginalPrice}
                  imageUrl={displayImageUrl ?? undefined}
                >
                  {displayDescription && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">{displayDescription}</p>
                  )}
                  <VariantAddToCart
                    productId={detail.id}
                    lang={lang}
                    variations={detail.variations}
                    variationMatrix={detail.variationMatrix}
                    selectedOptionIds={detail.selectedOptionIds}
                    navigateOnSelect={false}
                    onVariantResolved={handleVariantResolved}
                    commodityType={detail.commodityType}
                  />
                </SubscriptionProductActions>
              ) : (
                <>
                  <div className="relative">
                    <Price
                      formatted={displayPrice}
                      originalFormatted={displayOriginalPrice}
                      className="text-lg"
                    />
                    {childLoading && (
                      <div className="absolute inset-0 bg-white/60 rounded" />
                    )}
                  </div>

                  {displayDescription && (
                    <p className="text-sm text-gray-600 line-clamp-3">{displayDescription}</p>
                  )}

                  <VariantAddToCart
                    productId={detail.id}
                    lang={lang}
                    variations={detail.variations}
                    variationMatrix={detail.variationMatrix}
                    selectedOptionIds={detail.selectedOptionIds}
                    navigateOnSelect={false}
                    onVariantResolved={handleVariantResolved}
                    commodityType={detail.commodityType}
                  />
                </>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
