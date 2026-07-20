import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import type { NextJsPlasmicComponentLoader } from "@plasmicapp/loader-nextjs";
import { registerPlasmicComponents } from "./plasmic-registrations";

// Fallback literal (not imported from the server-only tenant-config module,
// which pulls in next/headers) — cms.host is normally already defaulted there.
const DEFAULT_PLASMIC_HOST = "https://codegen.euwest.storefront.elasticpath.com";

// initPlasmicLoader() sets up an SDK instance for one fixed project/token —
// memoize per projectId so different tenants' CMS projects each get their
// own loader instance (with its own component registrations) without
// reinitializing on every render.
const loaderCache = new Map<string, NextJsPlasmicComponentLoader>();

export function getClientPlasmicLoader(cms: {
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
    registerPlasmicComponents(loader);
    // Makes these available in Studio's Audience/Split targeting UI — see
    // PlasmicContent.tsx, which resolves the active variation from these
    // traits via loader.getActiveVariation({ traits: {...} }).
    loader.registerTrait("catalogId", {
      type: "text",
      label: "Catalog ID",
    });
    loader.registerTrait("language", {
      type: "text",
      label: "Language",
    });
    loader.registerTrait("accountName", {
      type: "text",
      label: "Account Name",
    });
    loader.registerTrait("epContextTag", {
      type: "text",
      label: "EP Context Tag",
    });
    loaderCache.set(cacheKey, loader);
  }
  return loader;
}
