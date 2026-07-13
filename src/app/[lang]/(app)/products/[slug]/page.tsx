import { notFound } from "next/navigation";
import { getTranslations, getMessages } from "next-intl/server";
import { Header } from "@/components/header/Header";
import { ProductThumbnail } from "@/components/product/ProductThumbnail";
import { ProductName } from "@/components/product/ProductName";
import { ProductDescription } from "@/components/product/ProductDescription";
import { Price } from "@/components/product/Price";
import { ProductActions } from "@/components/product/ProductActions";
import { VariationSubscriptionActions } from "@/components/product/VariationSubscriptionActions";
import { BulkBuyOffer } from "@/components/product/BulkBuyOffer";
import { Badge } from "@/components/ui/Badge/Badge";
import { Download } from "lucide-react";
import {
  getProductBySlug,
  getProductRelationshipCarousels,
} from "@/lib/api/products";
import { getProductOffering } from "@/lib/api/subscriptions";
import { getProductBreadcrumb } from "@/lib/api/breadcrumb";
import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";
import { ProductCarouselDisplay } from "@/components/product/ProductCarouselDisplay";
import { SubscriptionProductActions } from "@/components/product/SubscriptionProductActions";
import { ProductExtensions } from "@/components/product/ProductExtensions";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  return {
    title: product?.name ?? "Product",
    description: product?.description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { lang, slug } = await params;

  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const [t, messages, offering, relationshipCarousels, breadcrumbItems] = await Promise.all([
    getTranslations("product"),
    getMessages(),
    getProductOffering(product.id).catch(() => null),
    getProductRelationshipCarousels(
      product.id,
      product.customRelationshipSlugs ?? [],
    ).catch(() => []),
    product.breadCrumbNodes && product.breadCrumbs
      ? getProductBreadcrumb(lang, product.breadCrumbNodes, product.breadCrumbs).catch(() => [])
      : Promise.resolve([]),
  ]);

  const relMsgs = (
    (messages as Record<string, unknown>).product as Record<string, unknown>
  )?.customRelationships as Record<string, string> | undefined;

  function resolveCarouselTitle(slug: string): string {
    const key = slug
      .replace(/^crp[-_]?/i, "")
      .replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase());
    return (
      relMsgs?.[key] ??
      slug
        .replace(/^crp[-_]?/i, "")
        .replace(/[-_]/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProductBreadcrumb
          lang={lang}
          items={breadcrumbItems}
          productName={product.name}
          homeLabel={t("breadcrumbHome")}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left: Images */}
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              <ProductThumbnail
                imageUrl={product.imageUrl}
                name={product.name}
                className="w-full aspect-square"
                priority
              />
            </div>

            {product.additionalImages &&
              product.additionalImages.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {product.additionalImages.slice(0, 4).map((url, i) => (
                    <div
                      key={i}
                      className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50 aspect-square relative"
                    >
                      <ProductThumbnail
                        imageUrl={url}
                        name={`${product.name} view ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Right: Details */}
          <div className="flex flex-col">
            {(product.saleId && product.originalPriceFormatted) ||
            product.commodityType === "digital" ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {product.saleId && product.originalPriceFormatted && (
                  <Badge
                    variant="error"
                    size="sm"
                    className="bg-red-500 text-white uppercase tracking-wide px-3"
                  >
                    {product.saleId}
                  </Badge>
                )}
                {product.commodityType === "digital" && (
                  <Badge variant="info" size="sm">
                    <Download size={11} />
                    {t("digitalTag")}
                  </Badge>
                )}
              </div>
            ) : null}

            {product.sku && (
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                {t("skuLabel")}: {product.sku}
              </p>
            )}

            <ProductName
              name={product.name}
              as="h1"
              className="text-3xl sm:text-4xl mb-4"
            />

            {/* Variation products (parent or child): subscription slot renders between selectors and cart */}
            {!product.isBundle && (product.variations?.length ?? 0) > 0 ? (
              <>
                {product.bulkBuyTiers && product.bulkBuyTiers.length > 0 && (
                  <div className="mb-8">
                    <BulkBuyOffer tiers={product.bulkBuyTiers} />
                  </div>
                )}
                <VariationSubscriptionActions
                  productId={product.id}
                  lang={lang}
                  initialPrice={product.priceFormatted}
                  initialOriginalPrice={product.originalPriceFormatted}
                  variations={product.variations}
                  variationMatrix={product.variationMatrix}
                  childSlugs={product.childSlugs}
                  selectedOptionIds={product.selectedOptionIds}
                  parentId={product.parentId}
                  imageUrl={product.imageUrl ?? undefined}
                  initialOffering={offering}
                  navigateOnSelect={true}
                  productCustomInputs={product.customInputs}
                />
              </>
            ) : (
              <>
                {!product.isBundle && !offering && (
                  <div className="mb-6">
                    <Price
                      formatted={product.priceFormatted}
                      originalFormatted={product.originalPriceFormatted}
                      className="text-2xl"
                    />
                  </div>
                )}

                {product.bulkBuyTiers && product.bulkBuyTiers.length > 0 && (
                  <div className="mb-8">
                    <BulkBuyOffer tiers={product.bulkBuyTiers} />
                  </div>
                )}

                {!product.isBundle && offering ? (
                  <SubscriptionProductActions
                    offering={offering}
                    oneTimePrice={product.priceFormatted}
                    originalPrice={product.originalPriceFormatted}
                    imageUrl={product.imageUrl ?? undefined}
                  >
                    <ProductActions
                      productId={product.id}
                      lang={lang}
                      isBundle={product.isBundle}
                      components={product.components}
                      initialPrice={product.priceFormatted}
                      initialOriginalPrice={product.originalPriceFormatted}
                      variations={product.variations}
                      variationMatrix={product.variationMatrix}
                      childSlugs={product.childSlugs}
                      selectedOptionIds={product.selectedOptionIds}
                      parentId={product.parentId}
                      productCustomInputs={product.customInputs}
                      commodityType={product.commodityType}
                    />
                  </SubscriptionProductActions>
                ) : (
                  <ProductActions
                    productId={product.id}
                    lang={lang}
                    isBundle={product.isBundle}
                    components={product.components}
                    initialPrice={product.priceFormatted}
                    initialOriginalPrice={product.originalPriceFormatted}
                    variations={product.variations}
                    variationMatrix={product.variationMatrix}
                    childSlugs={product.childSlugs}
                    selectedOptionIds={product.selectedOptionIds}
                    parentId={product.parentId}
                    productCustomInputs={product.customInputs}
                    commodityType={product.commodityType}
                  />
                )}
              </>
            )}

            {product.description && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest mb-3">
                  {t("detailsLabel")}
                </h2>
                <ProductDescription
                  description={product.description}
                  className="text-base"
                />
              </div>
            )}

            {product.extensions && product.extensions.length > 0 && (
              <div className="mt-8">
                <ProductExtensions extensions={product.extensions} />
              </div>
            )}
          </div>
        </div>

        {relationshipCarousels.map((carousel) => (
          <section key={carousel.slug} className="mt-16">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {resolveCarouselTitle(carousel.slug)}
            </h2>
            <ProductCarouselDisplay products={carousel.products} lang={lang} />
          </section>
        ))}
      </main>
    </div>
  );
}
