import { cache } from "react";
import { unstable_cache } from "next/cache";
import { initPlasmicLoader as initServerPlasmicLoader } from "@plasmicapp/loader-react/react-server";
import { getServerPlasmicLoader } from "./plasmic-server-loader";
import { getPlasmicConfig } from "@/lib/plasmic-config";
import { DEFAULT_PLASMIC_HOST } from "@/lib/tenant-config";

type CmsArgs = [projectId: string, apiToken: string, host: string, component: string];

/**
 * Published content (cms.preview off): every maybeFetchComponentData call
 * re-downloads the design bundle from the CMS (seconds per call, on every
 * page render via Logo/Header/Footer), so cache the result per project +
 * component in the Data Cache across requests; design changes appear within
 * 5 minutes. projectId is part of the cached function's arguments (not just
 * the static key array), so different tenants' CMS projects never collide.
 */
const getPublishedComponentData = unstable_cache(
  async (...[projectId, apiToken, host, component]: CmsArgs) => {
    try {
      const loader = getServerPlasmicLoader({ projectId, apiToken, preview: false, host });
      return (await loader?.maybeFetchComponentData(component)) ?? null;
    } catch {
      return null;
    }
  },
  ["plasmic-component-data"],
  { revalidate: 300 },
);

/**
 * Preview content (cms.preview on): nothing is cached across requests, so
 * every page render pulls the latest draft from the CMS and nothing persists
 * on Vercel between requests. Two things make that true:
 *  - the Data Cache (unstable_cache) is bypassed entirely;
 *  - the loader is created per request (React cache() scopes it to the
 *    current render) via the base loader-react factory rather than the
 *    Next.js wrapper. The wrapper forces alwaysFresh on the server, which
 *    would re-download the whole bundle for each component on the page
 *    (logo, nav, footer, page body — 20s+ per request). A fresh non-alwaysFresh
 *    instance downloads once per request and serves every component from
 *    that in-memory bundle, then is discarded with the request.
 */
const getPreviewLoader = cache((projectId: string, apiToken: string, host: string) =>
  initServerPlasmicLoader({
    projects: [{ id: projectId, token: apiToken }],
    host: host || DEFAULT_PLASMIC_HOST,
    preview: true,
    alwaysFresh: false,
    // Same platform options the Next.js wrapper sets, so the generated code
    // matches what PlasmicRootProvider expects.
    platform: "nextjs",
    platformOptions: { nextjs: { appDir: true } },
    onClientSideFetch: "warn",
  }),
);

async function getPreviewComponentData(...[projectId, apiToken, host, component]: CmsArgs) {
  try {
    const loader = getPreviewLoader(projectId, apiToken, host);
    return (await loader.maybeFetchComponentData(component)) ?? null;
  } catch {
    return null;
  }
}

export async function getPlasmicComponentData(component: string) {
  const { projectId, apiToken, preview, host } = await getPlasmicConfig();
  if (!projectId || !apiToken) return null;
  return preview
    ? getPreviewComponentData(projectId, apiToken, host, component)
    : getPublishedComponentData(projectId, apiToken, host, component);
}
