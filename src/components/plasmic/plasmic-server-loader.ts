import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server";
import type { NextJsPlasmicComponentLoader } from "@plasmicapp/loader-nextjs/react-server";

// initPlasmicLoader() sets up an SDK instance for one fixed project/token —
// memoize per projectId so different tenants' CMS projects each get their
// own loader instance without reinitializing on every request.
const loaderCache = new Map<string, NextJsPlasmicComponentLoader>();

export function getServerPlasmicLoader(cms: {
  projectId: string;
  apiToken: string;
  preview: boolean;
}): NextJsPlasmicComponentLoader | null {
  if (!cms.projectId || !cms.apiToken) return null;
  const cacheKey = `${cms.projectId}:${cms.preview}`;
  let loader = loaderCache.get(cacheKey);
  if (!loader) {
    loader = initPlasmicLoader({
      projects: [{ id: cms.projectId, token: cms.apiToken }],
      host: "https://codegen.euwest.storefront.elasticpath.com",
      preview: cms.preview,
      platformOptions: { nextjs: { appDir: true } },
    });
    loaderCache.set(cacheKey, loader);
  }
  return loader;
}
