import { getTenantConfig } from "@/lib/tenant-config";

export async function getPlasmicConfig() {
  const { cms } = await getTenantConfig();
  return { ...cms, enabled: Boolean(cms.projectId && cms.apiToken) };
}
