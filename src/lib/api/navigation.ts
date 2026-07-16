import {
  getByContextAllHierarchies,
  getByContextAllNodes,
  type Node,
} from "@epcc-sdk/sdks-shopper";

export type NavHierarchyData = {
  id: string;
  slug: string;
  name: string;
};
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import { getTenantConfig } from "@/lib/tenant-config";
import { getResolvedCatalogId } from "@/lib/api/catalog";
import type { NavItem, NavColumn } from "@/components/header/navigation/types";

export type NavNodeData = {
  id: string;
  slug: string;
  name: string;
  hierarchyId: string;
};

type Crumb = { id: string; name: string; slug: string };

// /catalog/nodes returns every node flat, each carrying its own
// meta.breadcrumbs (hierarchy -> ... -> itself, with id/name/slug at every
// level) — that's enough to reconstruct the whole nav tree locally instead
// of walking hierarchies -> L2 children -> L3 children as separate calls.
async function fetchAllCatalogNodes(
  client: Awaited<ReturnType<typeof createElasticPathClient>>,
): Promise<Node[]> {
  const limit = 100;
  const first = await getByContextAllNodes({
    client,
    query: { "page[limit]": BigInt(limit), "page[offset]": BigInt(0) },
  });
  if (first.error) {
    const detail =
      (first.error as any)?.errors?.[0]?.detail ?? JSON.stringify(first.error);
    throw new Error(detail);
  }
  const all: Node[] = [...(first.data?.data ?? [])];
  const total = Number(first.data?.meta?.results?.total ?? all.length);

  // Large catalogs can be thousands of nodes deep across dozens of pages —
  // fetch the rest concurrently instead of one page at a time in sequence,
  // now that the total (and so the full set of offsets) is known up front.
  const remainingOffsets: number[] = [];
  for (let offset = limit; offset < total; offset += limit) {
    remainingOffsets.push(offset);
  }

  const rest = await Promise.all(
    remainingOffsets.map(async (offset) => {
      const res = await getByContextAllNodes({
        client,
        query: { "page[limit]": BigInt(limit), "page[offset]": BigInt(offset) },
      });
      if (res.error) {
        const detail =
          (res.error as any)?.errors?.[0]?.detail ?? JSON.stringify(res.error);
        throw new Error(detail);
      }
      return res.data?.data ?? [];
    }),
  );
  for (const batch of rest) all.push(...batch);
  return all;
}

function toCrumb(b: { id?: string; name?: string; slug?: string }): Crumb {
  return { id: b.id ?? "", name: b.name ?? "", slug: b.slug ?? b.id ?? "" };
}

type CrumbWithPath = Crumb & { path: string };

// hideNavHierarchy shifts which breadcrumb level becomes the top-level nav
// item: normally depth 1 (the hierarchy root itself) is the top item, depth
// 2 the mega-menu column, depth 3 the column link. With it on, depth 2
// (the hierarchy's direct children) become the top items instead — the
// hierarchy root is skipped entirely — and columns/links shift down to
// depth 3/4 accordingly. Same /catalog/nodes data either way, just bucketed
// starting one level deeper.
async function fetchSiteNavigation(hideNavHierarchy: boolean): Promise<NavItem[]> {
  const client = await createElasticPathClient();
  // The API returns nodes with hierarchy roots last (and in reverse
  // creation order) — reversing puts them first, in creation order, since
  // insertion order into the maps below determines the nav's display order.
  const nodes = (await fetchAllCatalogNodes(client)).reverse();

  const offset = hideNavHierarchy ? 1 : 0;

  const topById = new Map<string, CrumbWithPath>();
  const columnsByTop = new Map<string, Map<string, CrumbWithPath>>();
  const linksByColumn = new Map<string, CrumbWithPath[]>();

  for (const node of nodes) {
    const breadcrumbs = node.meta?.breadcrumbs;
    if (!breadcrumbs?.length) continue;
    const crumbs = breadcrumbs.map(toCrumb);
    const depth = crumbs.length;
    if (depth <= offset) continue; // hierarchy root itself, hidden entirely

    // Full slug path from the true root — kept even when the hierarchy
    // level is hidden from the nav, so links stay consistent with hrefs
    // built elsewhere in the site (e.g. product breadcrumbs).
    const withPath = (index: number): CrumbWithPath => ({
      ...crumbs[index],
      path: crumbs
        .slice(0, index + 1)
        .map((c) => c.slug)
        .join("/"),
    });

    if (depth === 1 + offset) {
      const top = withPath(offset);
      topById.set(top.id, top);
    } else if (depth === 2 + offset) {
      const topId = crumbs[offset].id;
      if (!columnsByTop.has(topId)) columnsByTop.set(topId, new Map());
      const column = withPath(1 + offset);
      columnsByTop.get(topId)!.set(column.id, column);
    } else if (depth === 3 + offset) {
      const columnId = crumbs[1 + offset].id;
      if (!linksByColumn.has(columnId)) linksByColumn.set(columnId, []);
      linksByColumn.get(columnId)!.push(withPath(2 + offset));
    }
    // Deeper levels aren't rendered — the mega menu only supports 2 levels
    // of nesting under a top-level item, matching the previous implementation.
  }

  const topItems = Array.from(topById.values()).slice(0, 5);

  return topItems.map((top): NavItem => {
    const topHref = `/category/${top.path}`;
    const columnList = Array.from(columnsByTop.get(top.id)?.values() ?? []).slice(
      0,
      5,
    );

    const columns: NavColumn[] = columnList.map((column) => {
      const columnHref = `/category/${column.path}`;
      const linkList = (linksByColumn.get(column.id) ?? []).slice(0, 8);

      const items = [
        ...linkList.map((link) => ({
          key: link.id,
          label: link.name,
          href: `/category/${link.path}`,
        })),
        {
          key: `view-all-${column.id}`,
          label: `View all ${column.name}`,
          href: columnHref,
        },
      ];

      return {
        groups: [{ heading: column.name, headingHref: columnHref, items }],
      };
    });

    return {
      key: top.id,
      label: top.name,
      href: topHref,
      megaMenu: columns.length > 0 ? { columns } : undefined,
    };
  });
}

// Keyed by resolved catalog release rather than hostname/account directly —
// getResolvedCatalogId() already varies per shopper context (B2B catalog
// rules scope which release an account sees), so two accounts landing on
// different catalog_ids naturally get separate cache entries, while
// everyone sharing the same resolved catalog shares one. endpointUrl +
// storeId + environmentId are included since one running server process can
// serve multiple tenants (see tokenCache in create-elastic-path-client.ts
// for the same pattern). No automatic expiry — cleared only via
// clearNavigationCache()/the /api/navigation/clear-cache route.
const navCache = new Map<string, NavItem[]>();
const navFetchPromises = new Map<string, Promise<NavItem[]>>();

function buildNavCacheKey(
  catalogId: string | null,
  endpointUrl: string,
  storeId: string | undefined,
  environmentId: string | undefined,
): string {
  return [catalogId ?? "", endpointUrl, storeId ?? "", environmentId ?? ""].join("::");
}

export async function buildSiteNavigation(): Promise<NavItem[]> {
  const tenantConfig = await getTenantConfig();
  const { features, epcc, requestHeaders } = tenantConfig;
  const catalogId = await getResolvedCatalogId();
  const cacheKey = buildNavCacheKey(
    catalogId,
    epcc.endpointUrl,
    requestHeaders.storeId,
    requestHeaders.environmentId,
  );

  const cached = navCache.get(cacheKey);
  if (cached) return cached;

  const inFlight = navFetchPromises.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = fetchSiteNavigation(features.hideNavHierarchy)
    .then((data) => {
      navCache.set(cacheKey, data);
      return data;
    })
    .finally(() => {
      navFetchPromises.delete(cacheKey);
    });

  navFetchPromises.set(cacheKey, promise);
  return promise;
}

export type NavCacheKeyParts = {
  catalogId?: string | null;
  endpointUrl: string;
  storeId?: string;
  environmentId?: string;
};

/**
 * Manual invalidation — see /api/navigation/clear-cache. Pass the same
 * catalogId/endpointUrl/storeId/environmentId used to build a cache entry to
 * clear just that entry; omit entirely to clear everything.
 */
export function clearNavigationCache(key?: NavCacheKeyParts): void {
  if (!key) {
    navCache.clear();
    navFetchPromises.clear();
    return;
  }
  const cacheKey = buildNavCacheKey(
    key.catalogId ?? null,
    key.endpointUrl,
    key.storeId,
    key.environmentId,
  );
  navCache.delete(cacheKey);
  navFetchPromises.delete(cacheKey);
}

export async function getHierarchyBySlug(
  slug: string,
): Promise<NavHierarchyData | null> {
  const client = await createElasticPathClient();
  const response = await getByContextAllHierarchies({ client });
  const hierarchy = (response.data?.data ?? []).find(
    (h) => (h.attributes as { slug?: string })?.slug === slug,
  );
  if (!hierarchy) return null;
  return {
    id: hierarchy.id ?? "",
    slug: (hierarchy.attributes as { slug?: string })?.slug ?? "",
    name: (hierarchy.attributes as { name?: string })?.name ?? "",
  };
}

export async function getNodeBySlug(slug: string): Promise<NavNodeData | null> {
  const client = await createElasticPathClient();
  const response = await getByContextAllNodes({
    client,
    query: { filter: `eq(slug,${slug})` },
  });
  const node = response.data?.data?.[0];
  if (!node) return null;
  return {
    id: node.id ?? "",
    slug: node.attributes?.slug ?? "",
    name: node.attributes?.name ?? "",
    hierarchyId:
      (node.relationships as { hierarchy?: { data?: { id?: string } } })
        ?.hierarchy?.data?.id ?? "",
  };
}
