"use client";

import { useMemo, useEffect, useRef } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  InstantSearch,
  useSearchBox,
  useHits,
  useInstantSearch,
} from "react-instantsearch";
import CatalogSearchInstantSearchAdapter from "@elasticpath/catalog-search-instantsearch-adapter";
import type { Client } from "@hey-api/client-fetch";
import { SEARCH_INDEX_NAME } from "@/lib/instantsearch-routing";
import { Price } from "@/components/product/Price";

type HitResult = {
  id: string;
  name: string;
  slug: string;
  price: string;
  originalPrice: string | undefined;
  imageUrl: string | undefined;
};

function hitToResult(hit: Record<string, unknown>): HitResult {
  const attrs = (hit.attributes as Record<string, any>) ?? {};
  const meta = (hit.meta as Record<string, any>) ?? {};
  const dp = meta.display_price ?? {};
  const odp = meta.original_display_price ?? {};
  const mainImage = hit.main_image as { link?: { href?: string } } | undefined;
  return {
    id: (hit.objectID as string) ?? (hit.id as string) ?? "",
    name: attrs.name ?? "",
    slug: attrs.slug ?? "",
    price: dp.with_tax?.formatted ?? dp.without_tax?.formatted ?? "",
    originalPrice:
      odp.without_tax?.formatted ?? odp.with_tax?.formatted ?? undefined,
    imageUrl: mainImage?.link?.href,
  };
}

// ─── Inner modal — must be mounted inside <InstantSearch> ─────────────────────

function SearchModal({
  lang,
  onClose,
}: {
  lang: string;
  onClose: () => void;
}) {
  const tHeader = useTranslations("header");
  const tSearch = useTranslations("search");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const { query, refine } = useSearchBox();
  const { hits } = useHits<Record<string, unknown>>();
  const { status } = useInstantSearch();

  const isLoading = status === "loading" || status === "stalled";
  const results = hits.map(hitToResult);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/${lang}/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Input row */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100">
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => refine(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tHeader("searchPlaceholder")}
          className="flex-1 ml-3 text-base bg-transparent outline-none placeholder:text-gray-400"
        />
        <button
          onClick={onClose}
          aria-label={tHeader("closeMenu")}
          className="ml-2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Empty / loading / results */}
      {!query && (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          {tHeader("searchPlaceholder")}
        </div>
      )}

      {query && isLoading && (
        <div className="px-4 py-3 space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-0 py-2 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {query && !isLoading && results.length > 0 && (
        <div>
          <ul>
            {results.map((result) => (
              <li key={result.id}>
                <Link
                  href={`/${lang}/products/${result.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  {result.imageUrl ? (
                    // Plain <img> intentionally — avoids Next.js server-side proxy for external URLs
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.imageUrl}
                      alt={result.name}
                      className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.name}
                    </p>
                    <Price
                      formatted={result.price}
                      originalFormatted={result.originalPrice}
                      className="text-xs"
                    />
                  </div>
                  <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link
              href={`/${lang}/search?q=${encodeURIComponent(query)}`}
              onClick={onClose}
              className="flex items-center justify-between text-sm font-medium text-brand-primary hover:underline"
            >
              <span>{tSearch("viewAllResults", { query })}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {query && !isLoading && results.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          {tSearch("noResultsForQuery", { query })}
        </div>
      )}
    </div>
  );
}

// ─── Dynamically-imported entry point ──────────────────────────────────────
// Split out of SearchButton.tsx so react-instantsearch + the search adapter
// (react-instantsearch + react-instantsearch-core + algoliasearch + adapter,
// several MB unpacked combined) are only fetched/parsed once a shopper
// actually opens search, instead of on every page load.

export default function SearchModalContent({
  lang,
  epClient,
  onClose,
}: {
  lang: string;
  epClient: Client;
  onClose: () => void;
}) {
  const searchClient = useMemo(() => {
    const adapter = new CatalogSearchInstantSearchAdapter({
      client: epClient as any,
      include: ["main_image"],
      additionalSearchParameters: {
        query_by: "name,description,sku",
        per_page: 6,
      },
    });
    return adapter.searchClient;
  }, [epClient]);

  return (
    <InstantSearch
      indexName={SEARCH_INDEX_NAME}
      searchClient={searchClient}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <SearchModal lang={lang} onClose={onClose} />
    </InstantSearch>
  );
}
