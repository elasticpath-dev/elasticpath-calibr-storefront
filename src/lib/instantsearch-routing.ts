"use client";

import type { UiState } from "instantsearch.js";

export const SEARCH_INDEX_NAME = "search";

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
