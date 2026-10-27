import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getServerPlasmicLoader } from "./plasmic-server-loader";
import { getPlasmicConfig } from "@/lib/plasmic-config";

type CmsArgs = [projectId: string, apiToken: string, host: string, component: string];

async function fetchComponentData(
  projectId: string,
  apiToken: string,
  preview: boolean,
  host: string,
  component: string,
) {
  try {
    const loader = getServerPlasmicLoader({ projectId, apiToken, preview, host });
    return (await loader?.maybeFetchComponentData(component)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Published content (cms.preview off): every maybeFetchComponentData call
 * re-downloads the design bundle from the CMS (seconds per call, on every
 * page render via Logo/Header/Footer), so cache the result per project +
 * component in the Data Cache across requests; design changes appear within
 * 5 minutes. projectId is part of the cached function's arguments (not just
 * the static key array), so different tenants' CMS projects never collide.
 */
const getPublishedComponentData = unstable_cache(
  (...args: CmsArgs) => fetchComponentData(args[0], args[1], false, args[2], args[3]),
  ["plasmic-component-data"],
  { revalidate: 300 },
);

/**
 * Preview content (cms.preview on): nothing is cached — not in the Data
 * Cache (so nothing persists on Vercel between requests) and not in the
 * loader (alwaysFresh, see plasmic-server-loader). Every page render pulls
 * the latest draft from the CMS. React's cache() still dedupes the fetch
 * within one request, so Logo/Header/Footer on the same page share a single
 * download rather than three.
 */
const getPreviewComponentData = cache((...args: CmsArgs) =>
  fetchComponentData(args[0], args[1], true, args[2], args[3]),
);

export async function getPlasmicComponentData(component: string) {
  const { projectId, apiToken, preview, host } = await getPlasmicConfig();
  if (!projectId || !apiToken) return null;
  return preview
    ? getPreviewComponentData(projectId, apiToken, host, component)
    : getPublishedComponentData(projectId, apiToken, host, component);
}
