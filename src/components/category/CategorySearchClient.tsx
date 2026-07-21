"use client";

import { useMemo, useState } from "react";
import {
  InstantSearch,
  useInstantSearch,
  useStats,
} from "react-instantsearch";
import { useTranslations } from "next-intl";
import CatalogSearchInstantSearchAdapter from "@elasticpath/catalog-search-instantsearch-adapter";
import { SlidersHorizontal, X } from "lucide-react";
import { useEpClient } from "@/components/ClientProvider";
import { getSelectedCurrency } from "@/lib/currency";
import { hasBulkBuyForCurrency } from "@/lib/bulk-buy";
import { PaginatedResults, InfiniteResults } from "@/components/search/ResultsGrid";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { Button } from "@/components/ui/Button";
import {
  CATEGORY_HIERARCHICAL_ATTRIBUTES,
  SEARCH_INDEX_NAME,
} from "@/lib/instantsearch-routing";
import { FilterSidebar } from "@/components/search/filters";
import { SortBy } from "@/components/search/SortBy";
import type { ProductCardData } from "@/lib/api/products";

function buildFacetBy(filterItems: string): string {
  const extras = filterItems
    .split(",")
    .map((e) => e.trim().split("|")[0]?.trim())
    .filter(Boolean) as string[];
  return [...CATEGORY_HIERARCHICAL_ATTRIBUTES, ...extras].join(",");
}

function hitToCard(hit: Record<string, unknown>): ProductCardData {
  const attrs = (hit.attributes as Record<string, any>) ?? {};
  const meta = (hit.meta as Record<string, any>) ?? {};
  const dp = meta.display_price ?? {};
  const odp = meta.original_display_price ?? {};
  const mainImage = hit.main_image as { link?: { href?: string } } | undefined;
  const productTypes = meta.product_types as string[] | undefined;

  return {
    id: (hit.objectID as string) ?? (hit.id as string) ?? "",
    name: attrs.name ?? "",
    sku: attrs.sku as string | undefined,
    slug: attrs.slug ?? "",
    description: attrs.description as string | undefined,
    priceFormatted: dp.with_tax?.formatted ?? dp.without_tax?.formatted ?? "",
    originalPriceFormatted:
      odp.without_tax?.formatted ?? odp.with_tax?.formatted ?? undefined,
    imageUrl: mainImage?.link?.href,
    hasVariations: Boolean(attrs.base_product),
    hasBulkBuy: hasBulkBuyForCurrency(attrs, getSelectedCurrency()),
    isBundle:
      !!productTypes?.includes("bundle") ||
      !!(attrs.components && Object.keys(attrs.components as object).length > 0),
  };
}

// ─── Category Results ─────────────────────────────────────────────────────────

function CategoryInner({
  lang,
  categoryName,
  filterItems,
  hideNavHierarchy,
}: {
  lang: string;
  categoryName: string;
  filterItems: string;
  hideNavHierarchy: boolean;
}) {
  const t = useTranslations("search");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { status, error, results } = useInstantSearch();
  const { nbHits } = useStats();
  const { lazyLoadResults } = useTenantConfig();

  const isLoading =
    (!results && status !== "error") ||
    status === "loading" ||
    status === "stalled";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
          {!isLoading && nbHits > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {nbHits} product{nbHits !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <SortBy />
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            {t("filters")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong className="font-semibold">{t("errorPrefix")}</strong>{" "}
          {error.message}
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <FilterSidebar
            filterItems={filterItems}
            hideNavHierarchy={hideNavHierarchy}
            currentCategoryName={categoryName}
          />
        </aside>

        <div className="flex-1 min-w-0">
          {/* Full skeleton only on the initial load (no results yet). While
              loading MORE (infinite scroll) or changing pages, results stay
              mounted so the grid doesn't flash/unmount. */}
          {isLoading && nbHits === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-1/4 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {nbHits > 0 && (
            lazyLoadResults ? (
              <InfiniteResults lang={lang} hitToCard={hitToCard} />
            ) : (
              <PaginatedResults lang={lang} hitToCard={hitToCard} />
            )
          )}

          {!isLoading && nbHits === 0 && !error && (
            <div className="py-20 text-center">
              <p className="text-gray-500 text-base">{t("noResults")}</p>
            </div>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative ml-auto h-full w-80 max-w-full bg-white shadow-xl overflow-y-auto p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                {t("filters")}
              </h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterSidebar
              filterItems={filterItems}
              hideNavHierarchy={hideNavHierarchy}
              currentCategoryName={categoryName}
            />
            <div className="mt-auto pt-6">
              <Button
                className="w-full"
                onClick={() => setMobileFiltersOpen(false)}
              >
                {t("viewResults")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root Provider ────────────────────────────────────────────────────────────

type Props = {
  lang: string;
  categoryName: string;
  slugs: string[];
  filterItems?: string;
  hideNavHierarchy?: boolean;
};

export function CategorySearchClient({
  lang,
  categoryName,
  slugs,
  filterItems = "",
  hideNavHierarchy = false,
}: Props) {
  const epClient = useEpClient();
  const tSearch = useTranslations("search");

  const slugKey = slugs.join(",");

  const searchClient = useMemo(() => {
    // No EP client while APIs are held (marketing mode, signed out).
    if (!epClient) return null;
    const nodeSlugFilter = slugs
      .map((s) => `meta.search.nodes.slug:=[\`${s}\`]`)
      .join(" && ");

    const adapter = new CatalogSearchInstantSearchAdapter({
      client: epClient as any,
      include: ["main_image"],
      additionalSearchParameters: {
        query_by: "name,description,sku",
        per_page: 15,
        filter_by: nodeSlugFilter,
        facet_by: buildFacetBy(filterItems),
      },
    });

    return adapter.searchClient;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epClient, slugKey, filterItems]);

  if (!searchClient) {
    return (
      <p className="py-20 text-center text-sm text-gray-500">
        {tSearch("signInToSearch")}
      </p>
    );
  }

  return (
    <InstantSearch
      indexName={SEARCH_INDEX_NAME}
      searchClient={searchClient}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <CategoryInner
        lang={lang}
        categoryName={categoryName}
        filterItems={filterItems}
        hideNavHierarchy={hideNavHierarchy}
      />
    </InstantSearch>
  );
}
