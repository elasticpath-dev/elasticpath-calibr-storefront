"use client";

import { useMemo, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  InstantSearch,
  useSearchBox,
  useHits,
  useInstantSearch,
} from "react-instantsearch";
import CatalogSearchInstantSearchAdapter from "@elasticpath/catalog-search-instantsearch-adapter";
import type { Client } from "@hey-api/client-fetch";
import { SEARCH_INDEX_NAME } from "@/lib/instantsearch-routing";
import { hitToResult, SearchResultsList } from "./SearchResultsList";

// ─── Inner modal — must be mounted inside <InstantSearch> ─────────────────────

function SearchModal({
  lang,
  onClose,
}: {
  lang: string;
  onClose: () => void;
}) {
  const tHeader = useTranslations("header");
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

      <SearchResultsList
        lang={lang}
        query={query}
        results={results}
        isLoading={isLoading}
        onNavigate={onClose}
      />
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
