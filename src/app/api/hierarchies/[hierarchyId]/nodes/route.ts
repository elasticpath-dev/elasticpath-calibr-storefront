import { NextRequest, NextResponse } from "next/server";
import { getByContextHierarchyChildNodes } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hierarchyId: string }> },
) {
  const { hierarchyId } = await params;

  if (!hierarchyId) return NextResponse.json({ data: [] });

  try {
    const client = await createElasticPathClient();
    const response = await getByContextHierarchyChildNodes({
      client,
      path: { hierarchy_id: hierarchyId },
      query: { "page[limit]": BigInt(100) },
    });

    const nodes = (response.data?.data ?? []).map((n) => ({
      id: n.id ?? "",
      name: n.attributes?.name ?? n.id ?? "",
    }));

    return NextResponse.json({ data: nodes });
  } catch (err) {
    console.error("Nodes fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch nodes" }, { status: 500 });
  }
}
