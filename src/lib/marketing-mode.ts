import { cookies } from "next/headers";
import { getTenantConfig } from "@/lib/tenant-config";

/**
 * True when Elastic Path API calls should be withheld server-side: the tenant
 * runs in non-transactional "marketing" mode AND the shopper isn't signed in
 * (no account-management token cookie). Server components/pages use this to
 * skip catalog/product fetches (and the access token they'd generate) so a
 * signed-out marketing visit renders Plasmic content only.
 */
export async function shouldHoldEpApis(): Promise<boolean> {
  const { features } = await getTenantConfig();
  if (!features.marketingMode) return false;
  try {
    return !(await cookies()).get("ep_am_token")?.value;
  } catch {
    // Outside a request context (e.g. build time) — treat as signed out.
    return true;
  }
}
