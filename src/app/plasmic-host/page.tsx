import { getTenantConfig, toClientTenantConfig } from "@/lib/tenant-config";
import { PlasmicHostClient } from "./PlasmicHostClient";

// Plasmic Studio loads this page (as an iframe "codegen host") from whatever
// domain its project is configured to point at — resolving tenant config
// here means each tenant's Plasmic Studio project authenticates against its
// own CMS project/token instead of one baked into the deployment's build.
export default async function PlasmicHostPage() {
  const tenantConfig = await getTenantConfig();
  return (
    <PlasmicHostClient clientTenantConfig={toClientTenantConfig(tenantConfig)} />
  );
}
