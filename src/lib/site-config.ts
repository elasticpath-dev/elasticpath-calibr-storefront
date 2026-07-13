import { getTenantConfig } from "@/lib/tenant-config";

/** Store branding — sourced from the resolved tenant config (per-request, per-domain). */
export async function getSiteConfig() {
  const { site } = await getTenantConfig();
  return site;
}
