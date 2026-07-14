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
  let offset = 0;
  const all: Node[] = [];
  for (;;) {
    const res = await getByContextAllNodes({
      client,
      query: { "page[limit]": BigInt(limit), "page[offset]": BigInt(offset) },
    });
    if (res.error) {
      const detail =
        (res.error as any)?.errors?.[0]?.detail ?? JSON.stringify(res.error);
      throw new Error(detail);
    }
    const batch = res.data?.data ?? [];
    all.push(...batch);
    const total = Number(res.data?.meta?.results?.total ?? all.length);
    offset += limit;
    if (batch.length === 0 || all.length >= total) break;
  }
  return all;
}

function toCrumb(b: { id?: string; name?: string; slug?: string }): Crumb {
  return { id: b.id ?? "", name: b.name ?? "", slug: b.slug ?? b.id ?? "" };
}

// Not cached: hierarchies/nodes are resolved "by context", which can differ
// per authenticated account (B2B catalog rules scope visible categories to
// the signed-in account) — caching this server-side would leak one
// account's catalog view to every other user/tenant sharing the cache.
// buildSiteNavigation() is called from the client-side navigation hook
// (see NavigationContext) instead of on every page render, so this still
// only runs once per session/account rather than "again and again".
async function fetchSiteNavigation(): Promise<NavItem[]> {
  const client = await createElasticPathClient();
  // The API returns nodes with hierarchy roots last (and in reverse
  // creation order) — reversing puts them first, in creation order, since
  // insertion order into the maps below determines the nav's display order.
  const nodes = (await fetchAllCatalogNodes(client)).reverse();

  // Depth 1 = hierarchy root (top-level nav item), depth 2 = mega-menu
  // column, depth 3 = column item — breadcrumbs always end with the node
  // itself, so depth === breadcrumbs.length.
  const hierarchiesById = new Map<string, Crumb>();
  const l2ByHierarchy = new Map<string, Map<string, Crumb>>();
  const l3ByL2 = new Map<string, Crumb[]>();

  for (const node of nodes) {
    const breadcrumbs = node.meta?.breadcrumbs;
    if (!breadcrumbs?.length) continue;
    const crumbs = breadcrumbs.map(toCrumb);
    const depth = crumbs.length;

    if (depth === 1) {
      hierarchiesById.set(crumbs[0].id, crumbs[0]);
    } else if (depth === 2) {
      const hierarchyId = crumbs[0].id;
      if (!l2ByHierarchy.has(hierarchyId))
        l2ByHierarchy.set(hierarchyId, new Map());
      l2ByHierarchy.get(hierarchyId)!.set(crumbs[1].id, crumbs[1]);
    } else if (depth === 3) {
      const l2Id = crumbs[1].id;
      if (!l3ByL2.has(l2Id)) l3ByL2.set(l2Id, []);
      l3ByL2.get(l2Id)!.push(crumbs[2]);
    }
    // Deeper levels aren't rendered — the mega menu only supports 2 levels
    // of nesting under a hierarchy, matching the previous implementation.
  }

  const hierarchies = Array.from(hierarchiesById.values()).slice(0, 5);

  return hierarchies.map((h): NavItem => {
    const hierarchyHref = `/category/${h.slug}`;
    const l2List = Array.from(l2ByHierarchy.get(h.id)?.values() ?? []).slice(
      0,
      5,
    );

    const columns: NavColumn[] = l2List.map((l2) => {
      const l2Href = `${hierarchyHref}/${l2.slug}`;
      const l3List = (l3ByL2.get(l2.id) ?? []).slice(0, 8);

      const items = [
        ...l3List.map((l3) => ({
          key: l3.id,
          label: l3.name,
          href: `${l2Href}/${l3.slug}`,
        })),
        {
          key: `view-all-${l2.id}`,
          label: `View all ${l2.name}`,
          href: l2Href,
        },
      ];

      return {
        groups: [{ heading: l2.name, headingHref: l2Href, items }],
      };
    });

    return {
      key: h.id,
      label: h.name,
      href: hierarchyHref,
      megaMenu: columns.length > 0 ? { columns } : undefined,
    };
  });
}

export async function buildSiteNavigation(): Promise<NavItem[]> {
  return fetchSiteNavigation();
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
