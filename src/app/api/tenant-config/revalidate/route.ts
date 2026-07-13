import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Lets the external tenant config system push an update immediately instead
 * of waiting out getTenantConfig()'s revalidate window. Call this right
 * after saving a tenant's config with { hostname } and a bearer token
 * matching TENANT_CONFIG_REVALIDATE_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.TENANT_CONFIG_REVALIDATE_SECRET || secret !== process.env.TENANT_CONFIG_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hostname } = await req.json().catch(() => ({ hostname: undefined }));
  if (!hostname || typeof hostname !== "string") {
    return NextResponse.json({ error: "Missing hostname" }, { status: 400 });
  }

  revalidateTag(`tenant-config:${hostname.toLowerCase().trim()}`, { expire: 0 });
  return NextResponse.json({ revalidated: true, hostname });
}
