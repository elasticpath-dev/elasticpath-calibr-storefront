"use client";

import type { UiState } from "instantsearch.js";

export const SEARCH_INDEX_NAME = "search";

// Each level's indexed value is the full path from the hierarchy root (e.g.
// lvl1 = "Orgill Hierarchy > Paint and Sundries", not just "Paint and
// Sundries") — react-instantsearch's hierarchical menu requires attributes[0]
// to hold values with zero path separators, so lvl0 must always be requested
// first regardless of hideNavHierarchy. Hiding the root from display is done
// by flattening the rendered tree in CategoryFilter, not by dropping lvl0 here.
export const CATEGORY_HIERARCHICAL_ATTRIBUTES = [
  "meta.search.categories.lvl0",
  "meta.search.categories.lvl1",
  "meta.search.categories.lvl2",
  "meta.search.categories.lvl3",
  "meta.search.categories.lvl4",
  "meta.search.categories.lvl5",
  "meta.search.categories.lvl6",
  "meta.search.categories.lvl7",
  "meta.search.categories.lvl8",
];

const RESERVED = new Set(["q", "page"]);

export function createSearchRouting() {
  return {
    stateMapping: {
      stateToRoute(uiState: UiState): Record<string, unknown> {
        const s = uiState[SEARCH_INDEX_NAME] ?? {};
        const result: Record<string, unknown> = {};
        if (s.query) result.q = s.query;
        if (s.page && s.page > 1) result.page = s.page;
        if (s.refinementList) {
          for (const [attr, values] of Object.entries(s.refinementList)) {
            if ((values as string[]).length > 0) result[attr] = values;
          }
        }
        return result;
      },
      routeToState(routeState: Record<string, unknown>): UiState {
        const refinementList: Record<string, string[]> = {};
        for (const [key, value] of Object.entries(routeState)) {
          if (!RESERVED.has(key)) {
            refinementList[key] = Array.isArray(value)
              ? (value as string[])
              : [String(value)];
          }
        }
        return {
          [SEARCH_INDEX_NAME]: {
            query: (routeState.q as string) ?? "",
            page: routeState.page ? Number(routeState.page) : undefined,
            ...(Object.keys(refinementList).length > 0
              ? { refinementList }
              : {}),
          },
        };
      },
    },
  };
}
