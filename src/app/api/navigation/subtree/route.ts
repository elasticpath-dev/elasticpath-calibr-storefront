import { NextRequest, NextResponse } from "next/server";
import { buildNavSubtree } from "@/lib/api/navigation";

/**
 * NavItem subtree rooted at a catalog hierarchy or node — consumed by the
 * Plasmic StorefrontNavigation component for items that reference catalog
 * content instead of static links. Pass exactly one of hierarchyId/nodeId.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hierarchyId = searchParams.get("hierarchyId")?.trim() || undefined;
  const nodeId = searchParams.get("nodeId")?.trim() || undefined;

  if ((!hierarchyId && !nodeId) || (hierarchyId && nodeId)) {
    return NextResponse.json(
      { error: "Provide exactly one of hierarchyId or nodeId" },
      { status: 400 },
    );
  }

  try {
    const subtree = await buildNavSubtree({ hierarchyId, nodeId });
    if (!subtree) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: subtree });
  } catch (err) {
    console.error("Navigation subtree fetch error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to load navigation subtree";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
