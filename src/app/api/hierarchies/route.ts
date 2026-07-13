import { NextResponse } from "next/server";
import { getByContextAllHierarchies } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

export async function GET() {
  try {
    const client = await createElasticPathClient();
    const response = await getByContextAllHierarchies({ client });

    const hierarchies = (response.data?.data ?? []).map((h) => ({
      id: h.id ?? "",
      name: h.attributes?.name ?? h.id ?? "",
    }));

    return NextResponse.json({ data: hierarchies });
  } catch (err) {
    console.error("Hierarchies fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch hierarchies" }, { status: 500 });
  }
}
