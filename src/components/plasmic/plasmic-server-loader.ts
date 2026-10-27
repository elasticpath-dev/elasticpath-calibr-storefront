import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server";
import type { NextJsPlasmicComponentLoader } from "@plasmicapp/loader-nextjs/react-server";
import { DEFAULT_PLASMIC_HOST } from "@/lib/tenant-config";

// initPlasmicLoader() sets up an SDK instance for one fixed project/token —
// memoize per projectId so different tenants' CMS projects each get their
// own loader instance without reinitializing on every request.
const loaderCache = new Map<string, NextJsPlasmicComponentLoader>();

export function getServerPlasmicLoader(cms: {
  projectId: string;
  apiToken: string;
  preview: boolean;
  host?: string;
}): NextJsPlasmicComponentLoader | null {
  if (!cms.projectId || !cms.apiToken) return null;
  const cacheKey = `${cms.projectId}:${cms.preview}:${cms.host ?? ""}`;
  let loader = loaderCache.get(cacheKey);
  if (!loader) {
    loader = initPlasmicLoader({
      projects: [{ id: cms.projectId, token: cms.apiToken }],
      host: cms.host || DEFAULT_PLASMIC_HOST,
      preview: cms.preview,
      platformOptions: { nextjs: { appDir: true } },
    });
    loaderCache.set(cacheKey, loader);
  }
  return loader;
}
