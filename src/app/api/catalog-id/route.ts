import { NextResponse } from "next/server";
import { resolveCatalogIdFromApi } from "@/lib/api/catalog";

export async function GET() {
  try {
    // Always resolves fresh: the client calls this only on first load and on
    // login/logout/account change, then caches the result in a cookie.
    const catalogId = await resolveCatalogIdFromApi();
    return NextResponse.json({ catalogId });
  } catch (err) {
    console.error("Catalog id fetch error:", err);
    return NextResponse.json({ catalogId: null }, { status: 200 });
  }
}
