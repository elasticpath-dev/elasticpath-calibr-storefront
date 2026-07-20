"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Price } from "@/components/product/Price";

export type HitResult = {
  id: string;
  name: string;
  sku: string | undefined;
  slug: string;
  price: string;
  originalPrice: string | undefined;
  imageUrl: string | undefined;
};

export function hitToResult(hit: Record<string, unknown>): HitResult {
  const attrs = (hit.attributes as Record<string, any>) ?? {};
  const meta = (hit.meta as Record<string, any>) ?? {};
  const dp = meta.display_price ?? {};
  const odp = meta.original_display_price ?? {};
  const mainImage = hit.main_image as { link?: { href?: string } } | undefined;
  return {
    id: (hit.objectID as string) ?? (hit.id as string) ?? "",
    name: attrs.name ?? "",
    sku: attrs.sku as string | undefined,
    slug: attrs.slug ?? "",
    price: dp.with_tax?.formatted ?? dp.without_tax?.formatted ?? "",
    originalPrice:
      odp.without_tax?.formatted ?? odp.with_tax?.formatted ?? undefined,
    imageUrl: mainImage?.link?.href,
  };
}

type SearchResultsListProps = {
  lang: string;
  query: string;
  results: HitResult[];
  isLoading: boolean;
  /** Called when a result / view-all link is clicked (close the dropdown/modal). */
  onNavigate: () => void;
};

/**
 * The instant-search results body shared by the search modal and the inline
 * header search bar's dropdown: loading skeleton, result rows, view-all
 * footer, and the no-results state.
 */
export function SearchResultsList({
  lang,
  query,
  results,
  isLoading,
  onNavigate,
}: SearchResultsListProps) {
  const tSearch = useTranslations("search");

  if (!query) return null;

  if (isLoading) {
    return (
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
    );
  }

  if (results.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        {tSearch("noResultsForQuery", { query })}
      </div>
    );
  }

  return (
    <div>
      <ul>
        {results.map((result) => (
          <li key={result.id}>
            <Link
              href={`/${lang}/products/${result.slug}`}
              onClick={onNavigate}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              {result.imageUrl ? (
                // Plain <img> intentionally — avoids Next.js server-side proxy for external URLs
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.imageUrl}
                  alt={result.name}
                  className="w-10 h-10 rounded-lg object-contain bg-gray-100 flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {result.name}
                </p>
                {result.sku && (
                  <p className="text-[11px] text-gray-400 font-mono truncate">
                    {result.sku}
                  </p>
                )}
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
          onClick={onNavigate}
          className="flex items-center justify-between text-sm font-medium text-brand-primary hover:underline"
        >
          <span>{tSearch("viewAllResults", { query })}</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
