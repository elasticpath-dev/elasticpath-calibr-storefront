import { getByContextAllNodes } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export async function getProductBreadcrumb(
  lang: string,
  breadCrumbNodes: string[],
  breadCrumbs: Record<string, string[]>,
): Promise<BreadcrumbItem[]> {
  if (!breadCrumbNodes.length) return [];

  // Pick the leaf node with the longest ancestor path (most specific category)
  const leafNodeId = breadCrumbNodes.reduce((best, nodeId) => {
    const pathLen = breadCrumbs[nodeId]?.length ?? 0;
    const bestLen = breadCrumbs[best]?.length ?? 0;
    return pathLen > bestLen ? nodeId : best;
  }, breadCrumbNodes[0]);

  // bread_crumbs[leafId] = [root-ancestor, ..., closest-ancestor] — already root-first
  const ancestorIds = breadCrumbs[leafNodeId] ?? [];
  const allNodeIds = [...ancestorIds, leafNodeId];

  const client = await createElasticPathClient();

  const nodesRes = await getByContextAllNodes({
    client,
    query: { filter: `in(id,${allNodeIds.join(",")})` },
  }).catch(() => null);

  const nodesMap = new Map(
    (nodesRes?.data?.data ?? []).map((n) => [n.id, n]),
  );
  const orderedNodes = allNodeIds
    .map((id) => nodesMap.get(id))
    .filter((n): n is NonNullable<typeof n> => !!n);

  if (!orderedNodes.length) return [];

  // Build URLs from node slugs directly — no hierarchy fetch needed.
  // The category page resolves by the leaf (last) slug, so cumulative slug paths work.
  return orderedNodes.map((node, idx) => {
    const slugPath = orderedNodes
      .slice(0, idx + 1)
      .map((n) => n.attributes?.slug ?? n.id)
      .join("/");
    return {
      name: node.attributes?.name ?? "",
      href: `/${lang}/category/${slugPath}`,
    };
  });
}
