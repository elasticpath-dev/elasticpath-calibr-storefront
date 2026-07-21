import { listLocations, type Location } from "@epcc-sdk/sdks-shopper";
import type { Client } from "@hey-api/client-fetch";

/**
 * Memoized fetch of all inventory locations. The header indicator and the
 * settings selector both need locations, and the header re-mounts on every
 * page navigation, so the in-flight/resolved promise is cached at module scope
 * to avoid refetching. Locations are store-global (not account-scoped); a full
 * reload (login/logout) resets this module state. On error the cache is cleared
 * so the next call retries.
 */
let cache: Promise<Location[]> | null = null;

export function fetchLocations(client: Client): Promise<Location[]> {
  if (!cache) {
    cache = listLocations({ client })
      .then((res) => (res?.data?.data ?? []) as Location[])
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}
