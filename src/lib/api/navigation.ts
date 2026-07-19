import { unstable_cache, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
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
import {
  createElasticPathClient,
  createElasticPathClientFromConfig,
} from "@/lib/create-elastic-path-client";
import { getTenantConfig } from "@/lib/tenant-config";
import { getResolvedCatalogId } from "@/lib/api/catalog";
import type {
  NavItem,
  NavColumn,
  NavTreeNode,
} from "@/components/header/navigation/types";

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
async function fetchSiteNavigation(
  client: Awaited<ReturnType<typeof createElasticPathClient>>,
  hideNavHierarchy: boolean,
): Promise<NavItem[]> {
  // The API returns nodes with hierarchy roots last (and in reverse
  // creation order) — reversing puts them first, in creation order, since
  // insertion order into the maps below determines the nav's display order.
  const nodes = (await fetchAllCatalogNodes(client)).reverse();

  const offset = hideNavHierarchy ? 1 : 0;

  const topById = new Map<string, CrumbWithPath>();
  // Full adjacency map (parent node id -> child nodes), every depth — the
  // cascade style drills through the entire tree, so unlike the mega menu
  // nothing is truncated here.
  const childrenByParent = new Map<string, CrumbWithPath[]>();

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

    const self = withPath(depth - 1);
    if (depth === 1 + offset) {
      topById.set(self.id, self);
    } else {
      const parentId = crumbs[depth - 2].id;
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId)!.push(self);
    }
  }

  const topItems = Array.from(topById.values()).slice(0, 5);

  return topItems.map((top): NavItem =>
    assembleNavItem(top, childrenByParent),
  );
}

// Shared by the main nav build and subtree derivation: turns one root crumb
// plus the adjacency map into a NavItem carrying both dropdown shapes.
// - megaMenu keeps the layout-driven caps (5 columns × 8 links + view-all),
//   matching the previous implementation exactly.
// - children is the FULL tree, uncapped in both node count and depth — the
//   cascade style keeps drilling for as long as the catalog goes.
function assembleNavItem(
  root: CrumbWithPath,
  childrenByParent: Map<string, CrumbWithPath[]>,
): NavItem {
  const toTree = (c: CrumbWithPath): NavTreeNode => {
    const kids = childrenByParent.get(c.id);
    return {
      key: c.id,
      label: c.name,
      href: `/category/${c.path}`,
      children: kids?.length ? kids.map(toTree) : undefined,
    };
  };

  const columnList = (childrenByParent.get(root.id) ?? []).slice(0, 5);

  const columns: NavColumn[] = columnList.map((column) => {
    const columnHref = `/category/${column.path}`;
    const linkList = (childrenByParent.get(column.id) ?? []).slice(0, 8);

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

  const children = (childrenByParent.get(root.id) ?? []).map(toTree);

  return {
    key: root.id,
    label: root.name,
    href: `/category/${root.path}`,
    megaMenu: columns.length > 0 ? { columns } : undefined,
    children: children.length > 0 ? children : undefined,
  };
}

// Navigation is keyed by the resolved catalog_id alone. A catalog_id is
// globally unique, so it already implies the endpoint / store / environment —
// two accounts on the same catalog share one entry; different catalogs get
// separate entries. Backed by Next's Data Cache (unstable_cache) so it's
// shared across serverless instances (unlike an in-memory Map). No automatic
// expiry (revalidate: false) — cleared only via clearNavigationCache() / the
// /api/navigation/clear-cache route.
const NAV_CACHE_TAG = "navigation";

function navCacheTag(catalogId: string | null): string {
  return `${NAV_CACHE_TAG}:${catalogId ?? ""}`;
}

// The build params (endpointUrl, clientId, etc.) are captured via closure, not
// put in the cache key — for a given catalog_id they're already determined by
// the tenant/context. unstable_cache forbids cookies() inside the wrapped
// function, so the client is built from plain config via
// createElasticPathClientFromConfig.
//
// The account-management token from the shopper's cookie is likewise passed
// via closure: the catalog a shopper resolves to is account-scoped, so the
// node fetch MUST carry this token to return the right catalog's nodes — but
// it stays out of the key so accounts sharing a catalog share the entry.
async function getAmToken(): Promise<string | undefined> {
  try {
    return (await cookies()).get("ep_am_token")?.value;
  } catch {
    return undefined;
  }
}

function getCachedNavItems(
  catalogId: string | null,
  endpointUrl: string,
  clientId: string,
  tokenCurrency: string,
  multiLocation: boolean,
  epContextTag: string | undefined,
  environmentId: string | undefined,
  storeId: string | undefined,
  hideNavHierarchy: boolean,
  amToken: string | undefined,
): Promise<NavItem[]> {
  return unstable_cache(
    async () => {
      const client = createElasticPathClientFromConfig(
        {
          endpointUrl,
          clientId,
          currency: tokenCurrency,
          tokenCurrency,
          multiLocation,
          epContextTag,
          environmentId,
          storeId,
        },
        amToken,
      );
      return fetchSiteNavigation(client, hideNavHierarchy);
    },
    [
      // Keyed by catalog_id alone (v4). revalidate:false entries never expire,
      // so the version must change whenever the payload shape/content changes.
      "site-navigation-v4",
      catalogId ?? "",
    ],
    {
      revalidate: false,
      tags: [NAV_CACHE_TAG, navCacheTag(catalogId)],
    },
  )();
}

export async function buildSiteNavigation(): Promise<NavItem[]> {
  const tenantConfig = await getTenantConfig();
  const { features, epcc, inventory, requestHeaders, currency } = tenantConfig;
  const [catalogId, amToken] = await Promise.all([
    getResolvedCatalogId(),
    getAmToken(),
  ]);

  return getCachedNavItems(
    catalogId,
    epcc.endpointUrl,
    epcc.clientId,
    currency.default,
    inventory.multiLocation,
    requestHeaders.epContextTag,
    requestHeaders.environmentId,
    requestHeaders.storeId,
    features.hideNavHierarchy,
    amToken,
  );
}

// Builds a NavItem subtree rooted at a hierarchy or node id from the flat
// node list, using the same breadcrumb-bucketing idea as fetchSiteNavigation
// but relative to the chosen root: a node whose breadcrumbs contain rootId
// at index r is a descendant at depth (length-1)-r. Works for hierarchy
// roots too — hierarchies aren't themselves nodes, but every descendant
// carries the hierarchy as breadcrumbs[0], which is enough to reconstruct
// the root's label/slug.
function deriveNavSubtree(nodes: Node[], rootId: string): NavItem | null {
  let root: CrumbWithPath | null = null;
  const childrenByParent = new Map<string, CrumbWithPath[]>();

  // Reversed for the same reason as fetchSiteNavigation: the API returns
  // roots last / reverse creation order, and insertion order below drives
  // display order.
  for (const node of [...nodes].reverse()) {
    const breadcrumbs = node.meta?.breadcrumbs;
    if (!breadcrumbs?.length) continue;
    const crumbs = breadcrumbs.map(toCrumb);
    const rootIndex = crumbs.findIndex((c) => c.id === rootId);
    if (rootIndex === -1) continue;

    const withPath = (index: number): CrumbWithPath => ({
      ...crumbs[index],
      path: crumbs
        .slice(0, index + 1)
        .map((c) => c.slug)
        .join("/"),
    });

    if (!root) root = withPath(rootIndex);

    // Every descendant, unlimited depth — the adjacency map feeds
    // assembleNavItem, which caps only the mega-menu shape, not the tree.
    if (crumbs.length - 1 > rootIndex) {
      const parentId = crumbs[crumbs.length - 2].id;
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId)!.push(withPath(crumbs.length - 1));
    }
  }

  if (!root) return null;
  return assembleNavItem(root, childrenByParent);
}

// Cached per subtree root (small payloads — caching the raw ~6k-node list
// itself would exceed data-cache entry limits). Shares the navigation tags,
// so /api/navigation/clear-cache invalidates subtrees too.
function getCachedNavSubtree(
  catalogId: string | null,
  endpointUrl: string,
  clientId: string,
  tokenCurrency: string,
  multiLocation: boolean,
  epContextTag: string | undefined,
  environmentId: string | undefined,
  storeId: string | undefined,
  rootId: string,
  amToken: string | undefined,
): Promise<NavItem | null> {
  return unstable_cache(
    async () => {
      const client = createElasticPathClientFromConfig(
        {
          endpointUrl,
          clientId,
          currency: tokenCurrency,
          tokenCurrency,
          multiLocation,
          epContextTag,
          environmentId,
          storeId,
        },
        amToken,
      );
      const nodes = await fetchAllCatalogNodes(client);
      return deriveNavSubtree(nodes, rootId);
    },
    [
      // Keyed by catalog_id + subtree root (v3).
      "nav-subtree-v3",
      catalogId ?? "",
      rootId,
    ],
    {
      revalidate: false,
      tags: [NAV_CACHE_TAG, navCacheTag(catalogId)],
    },
  )();
}

/**
 * NavItem subtree rooted at a catalog hierarchy or node — used by
 * Plasmic-driven navigation items that reference catalog content (see
 * /api/navigation/subtree).
 */
export async function buildNavSubtree(opts: {
  hierarchyId?: string;
  nodeId?: string;
}): Promise<NavItem | null> {
  const rootId = opts.hierarchyId ?? opts.nodeId;
  if (!rootId) return null;

  const tenantConfig = await getTenantConfig();
  const { epcc, inventory, requestHeaders, currency } = tenantConfig;
  const [catalogId, amToken] = await Promise.all([
    getResolvedCatalogId(),
    getAmToken(),
  ]);

  return getCachedNavSubtree(
    catalogId,
    epcc.endpointUrl,
    epcc.clientId,
    currency.default,
    inventory.multiLocation,
    requestHeaders.epContextTag,
    requestHeaders.environmentId,
    requestHeaders.storeId,
    rootId,
    amToken,
  );
}

/**
 * Manual invalidation — see /api/navigation/clear-cache. Pass a catalogId to
 * clear that catalog's navigation (and its subtrees); omit it to clear all
 * navigation cache.
 */
export function clearNavigationCache(catalogId?: string | null): void {
  if (catalogId) {
    revalidateTag(navCacheTag(catalogId), { expire: 0 });
    return;
  }
  revalidateTag(NAV_CACHE_TAG, { expire: 0 });
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
