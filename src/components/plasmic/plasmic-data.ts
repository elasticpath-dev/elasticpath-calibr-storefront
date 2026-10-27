import { unstable_cache } from "next/cache";
import { getServerPlasmicLoader } from "./plasmic-server-loader";
import { getPlasmicConfig } from "@/lib/plasmic-config";

/**
 * The loader runs in preview mode, where every maybeFetchComponentData
 * call re-downloads the full design bundle from the CMS (seconds per
 * call, on every page render via Logo/Footer). Cache the result per
 * project + component across requests; design changes appear within 5
 * minutes. projectId is part of the cached function's arguments (not just
 * the static key array), so different tenants' CMS projects never collide.
 */
const getCachedComponentData = unstable_cache(
  async (
    projectId: string,
    apiToken: string,
    preview: boolean,
    host: string,
    component: string,
  ) => {
    try {
      const loader = getServerPlasmicLoader({ projectId, apiToken, preview, host });
      return (await loader?.maybeFetchComponentData(component)) ?? null;
    } catch {
      return null;
    }
  },
  ["plasmic-component-data"],
  { revalidate: 300 },
);

export async function getPlasmicComponentData(component: string) {
  const { projectId, apiToken, preview, host } = await getPlasmicConfig();
  if (!projectId || !apiToken) return null;
  return getCachedComponentData(projectId, apiToken, preview, host, component);
}
