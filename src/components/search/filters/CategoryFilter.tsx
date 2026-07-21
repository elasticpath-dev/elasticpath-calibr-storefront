"use client";

import { type ReactNode, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHierarchicalMenu, useHits, useInstantSearch } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CATEGORY_HIERARCHICAL_ATTRIBUTES } from "@/lib/instantsearch-routing";
import { FilterSection } from "./FilterSection";

// How the index stores lvlN category values ("Root > Child > Grandchild").
const SEPARATOR = " > ";
const CATEGORY_FACET_PREFIX = "meta.search.categories.lvl";
// Search page: show the hierarchy root plus its first level of categories
// (2 path segments). Category pages show the full scoped subtree.
const SEARCH_MAX_SEGMENTS = 2;

type TreeNode = {
  path: string;
  label: string;
  count: number;
  children: TreeNode[];
};

/**
 * Builds a nested category tree from the SCOPED main-query facet counts
 * (results._rawResults[0].facets). The main search response already computes
 * every category level (facet_by includes them), so the whole category filter
 * — on both search and category pages — comes from that one response with NO
 * additional facet queries. `maxSegments` caps depth: the (unscoped) search
 * page only shows the top level, category pages show everything in scope.
 */
function buildScopedTree(
  facets: Record<string, Record<string, number>> | undefined,
  maxSegments: number,
): TreeNode[] {
  if (!facets) return [];
  const byPath = new Map<string, TreeNode>();
  for (const [attr, values] of Object.entries(facets)) {
    if (!attr.startsWith(CATEGORY_FACET_PREFIX)) continue;
    for (const [path, count] of Object.entries(values)) {
      if (path.split(SEPARATOR).length > maxSegments) continue;
      if (!byPath.has(path)) {
        byPath.set(path, {
          path,
          label: path.split(SEPARATOR).pop() ?? path,
          count,
          children: [],
        });
      }
    }
  }

  const roots: TreeNode[] = [];
  for (const node of byPath.values()) {
    const idx = node.path.lastIndexOf(SEPARATOR);
    const parent = idx === -1 ? undefined : byPath.get(node.path.slice(0, idx));
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** Kebab-case fallback for a category slug (spaces → hyphens, case kept),
 * matching how the catalog slugifies node names. */
function slugify(name: string): string {
  return name.trim().replace(/\s+/g, "-");
}

type Props = {
  title?: string;
  hideNavHierarchy?: boolean;
  /** Set on category pages: highlights the current node and shows the full
   * scoped subtree. Unset on the search page, which shows only the top level. */
  currentCategoryName?: string;
};

export function CategoryFilter({
  title,
  hideNavHierarchy = false,
  currentCategoryName,
}: Props) {
  const t = useTranslations("search");
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] || "en";
  const { results } = useInstantSearch();
  const { items: hits } = useHits<Record<string, unknown>>();
  // On the search page, clicking a category refines the current query in place
  // (via the hierarchical facet) instead of navigating to the category page —
  // so the keyword search is preserved and results are query AND category.
  const { refine: refineCategory } = useHierarchicalMenu({
    attributes: CATEGORY_HIERARCHICAL_ATTRIBUTES,
  });
  const isSearchContext = !currentCategoryName;

  const maxSegments = currentCategoryName ? Infinity : SEARCH_MAX_SEGMENTS;

  const roots = useMemo(() => {
    const facets = (results as unknown as {
      _rawResults?: Array<{ facets?: Record<string, Record<string, number>> }>;
    })?._rawResults?.[0]?.facets;
    return buildScopedTree(facets, maxSegments);
  }, [results, maxSegments]);

  // Category name → slug from the current results' node paths, so rows link to
  // the matching category page without any extra lookup.
  const nameToSlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const hit of hits) {
      const nodes = (hit as { meta?: { search?: { nodes?: unknown } } })?.meta
        ?.search?.nodes;
      if (!Array.isArray(nodes)) continue;
      for (const node of nodes) {
        const n = node as { name?: string; slug?: string };
        if (n?.name && n?.slug) map.set(n.name, n.slug);
      }
    }
    return map;
  }, [hits]);

  const hrefFor = (node: TreeNode): string => {
    const slugs = node.path
      .split(SEPARATOR)
      .map((name) => nameToSlug.get(name) ?? slugify(name));
    return `/${lang}/category/${slugs.join("/")}`;
  };

  function renderTree(list: TreeNode[], depth = 0): ReactNode {
    return list.map((node) => {
      const isCurrent = node.label === currentCategoryName;
      const rowClass = cn(
        "w-full flex items-center justify-between rounded-md pr-2 py-1.5 text-sm transition-colors text-left",
        isCurrent
          ? "font-semibold text-brand-primary bg-brand-primary/5"
          : "text-gray-700 hover:bg-gray-50",
      );
      const rowInner = (
        <>
          <span className="truncate">{node.label}</span>
          <span className="ml-2 text-xs text-gray-400 flex-shrink-0">
            {node.count}
          </span>
        </>
      );
      return (
        <div key={node.path}>
          {isSearchContext ? (
            // Search page: refine the current query in place (keeps the keyword).
            <button
              type="button"
              onClick={() => refineCategory(node.path)}
              style={{ paddingLeft: 8 + depth * 14 }}
              className={rowClass}
            >
              {rowInner}
            </button>
          ) : (
            // Category page: navigate into the category.
            <Link
              href={hrefFor(node)}
              style={{ paddingLeft: 8 + depth * 14 }}
              className={rowClass}
            >
              {rowInner}
            </Link>
          )}
          {node.children.length > 0 && (
            <div className="mt-0.5">{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  // Hide the hierarchy root the same way the top nav does: promote its
  // children to the top level.
  const topNodes = hideNavHierarchy ? roots.flatMap((r) => r.children) : roots;
  if (!topNodes.length) return null;

  return (
    <FilterSection title={title ?? t("categories")}>
      {renderTree(topNodes)}
    </FilterSection>
  );
}
