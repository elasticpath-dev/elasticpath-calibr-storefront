import { NextResponse } from "next/server";
import { buildSiteNavigation } from "@/lib/api/navigation";

export async function GET() {
  try {
    const navItems = await buildSiteNavigation();
    return NextResponse.json(navItems);
  } catch (err) {
    console.error("Navigation fetch error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
