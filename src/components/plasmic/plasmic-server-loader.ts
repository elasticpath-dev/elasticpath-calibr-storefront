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
      // The loader keeps the fetched bundle in memory for the life of this
      // (memoized) instance and only re-fetches for components it hasn't
      // seen. In preview that would pin the first draft it downloaded until
      // the server restarts — alwaysFresh makes every call hit the CMS so
      // the latest draft is rendered (plasmic-data.ts dedupes per request).
      alwaysFresh: cms.preview,
      platformOptions: { nextjs: { appDir: true } },
    });
    loaderCache.set(cacheKey, loader);
  }
  return loader;
}
