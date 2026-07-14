import { NextResponse } from "next/server";
import { buildSiteNavigation } from "@/lib/api/navigation";

export async function GET() {
  try {
    const navItems = await buildSiteNavigation();
    return NextResponse.json({ data: navItems });
  } catch (err) {
    console.error("Navigation fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to load navigation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
