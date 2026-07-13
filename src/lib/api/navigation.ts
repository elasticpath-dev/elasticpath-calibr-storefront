import {
  getByContextAllHierarchies,
  getByContextHierarchyChildNodes,
  getByContextChildNodes,
  getByContextAllNodes,
} from "@epcc-sdk/sdks-shopper";

export type NavHierarchyData = {
  id: string;
  slug: string;
  name: string;
};
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import type { NavItem } from "@/components/header/navigation/types";

export type NavNodeData = {
  id: string;
  slug: string;
  name: string;
  hierarchyId: string;
};

// Not cached: hierarchies/nodes are resolved "by context", which can differ
// per authenticated account (B2B catalog rules scope visible categories to
// the signed-in account) — caching this server-side would leak one
// account's catalog view to every other user/tenant sharing the cache.
// buildSiteNavigation() is called from the client-side navigation hook
// (see NavigationContext) instead of on every page render, so this still
// only runs once per session/account rather than "again and again".
async function fetchSiteNavigation(): Promise<NavItem[]> {
  const client = await createElasticPathClient();

  const hierRes = await getByContextAllHierarchies({ client });
  const hierarchies = (hierRes.data?.data ?? []).slice(0, 5);

  const navItems = await Promise.all(
    hierarchies.map(async (h) => {
      const hierarchySlug = h.attributes?.slug ?? h.id!;
      const hierarchyHref = `/category/${hierarchySlug}`;

      const childRes = await getByContextHierarchyChildNodes({
        client,
        path: { hierarchy_id: h.id! },
        query: { "page[limit]": BigInt(10) },
      });
      const l2Nodes = (childRes.data?.data ?? []).slice(0, 5);

      // For each L2 node, fetch its L3 children in parallel
      const columns = await Promise.all(
        l2Nodes.map(async (l2) => {
          const l2Slug = l2.attributes?.slug ?? l2.id!;
          const l2Href = `/category/${hierarchySlug}/${l2Slug}`;

          const l3Res = await getByContextChildNodes({
            client,
            path: { node_id: l2.id! },
            query: { "page[limit]": BigInt(8) },
          }).catch(() => null);
          const l3Nodes = l3Res?.data?.data ?? [];

          const items = [
            ...l3Nodes.map((l3) => ({
              key: l3.id ?? "",
              label: l3.attributes?.name ?? "",
              href: `/category/${hierarchySlug}/${l2Slug}/${l3.attributes?.slug ?? l3.id}`,
            })),
            {
              key: `view-all-${l2.id}`,
              label: `View all ${l2.attributes?.name ?? ""}`,
              href: l2Href,
            },
          ];

          return {
            groups: [
              {
                heading: l2.attributes?.name ?? "",
                headingHref: l2Href,
                items,
              },
            ],
          };
        })
      );

      return {
        key: h.id ?? "",
        label: h.attributes?.name ?? "",
        href: hierarchyHref,
        megaMenu: columns.length > 0 ? { columns } : undefined,
      } satisfies NavItem;
    })
  );

  return navItems;
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
      (node.relationships as { hierarchy?: { data?: { id?: string } } })?.hierarchy?.data?.id ?? "",
  };
}
