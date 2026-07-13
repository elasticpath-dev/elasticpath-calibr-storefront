import { NextResponse } from "next/server";
import { getResolvedCatalogId } from "@/lib/api/catalog";

export async function GET() {
  try {
    const catalogId = await getResolvedCatalogId();
    return NextResponse.json({ catalogId });
  } catch (err) {
    console.error("Catalog id fetch error:", err);
    return NextResponse.json({ catalogId: null }, { status: 200 });
  }
}
