"use client";

import { useEffect, useMemo } from "react";
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

// Keeps InstantSearch's query in sync with the header input, which lives
// outside the <InstantSearch> tree.
function QuerySync({ query }: { query: string }) {
  const { query: current, refine } = useSearchBox();
  useEffect(() => {
    if (query !== current) refine(query);
  }, [query, current, refine]);
  return null;
}

function Results({ lang, onNavigate }: { lang: string; onNavigate: () => void }) {
  const { query } = useSearchBox();
  const { hits } = useHits<Record<string, unknown>>();
  const { status } = useInstantSearch();
  const isLoading = status === "loading" || status === "stalled";

  return (
    <SearchResultsList
      lang={lang}
      query={query}
      results={hits.map(hitToResult)}
      isLoading={isLoading}
      onNavigate={onNavigate}
    />
  );
}

/**
 * Live results for the inline header search bar — same instant-search
 * experience as the search modal, rendered as a dropdown. Dynamically
 * imported by HeaderSearchBar (first keystroke) so react-instantsearch +
 * the search adapter stay out of the initial page load, mirroring
 * SearchButton/SearchModalContent.
 */
export default function HeaderSearchResults({
  lang,
  epClient,
  query,
  onNavigate,
}: {
  lang: string;
  epClient: Client;
  query: string;
  onNavigate: () => void;
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
      <QuerySync query={query} />
      <Results lang={lang} onNavigate={onNavigate} />
    </InstantSearch>
  );
}
