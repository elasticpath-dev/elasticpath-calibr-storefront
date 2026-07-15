import { postV2AccountMembersTokens } from "@epcc-sdk/sdks-shopper";
import {
  getAuthClient,
  buildCredentials,
  fetchMemberProfile,
  type AccountMemberCredentials,
  type EpConnectionConfig,
} from "./auth";

export type OidcProfileInfo = {
  id: string;
  name: string;
  clientId: string;
  authorizationEndpoint: string;
};

type ExtraEpHeaders = {
  epContextTag?: string;
  environmentId?: string;
  storeId?: string;
};

// Some tenants scope their EPCC org by store/environment (multi-store orgs
// sharing one endpoint) — without these headers, the realm/profile lookups
// below can silently resolve against the wrong store and return nothing,
// even though the request itself "succeeds". Mirrors the headers
// create-elastic-path-client.ts/ep-client.ts already attach to every
// SDK-based request.
function extraHeaders(config: ExtraEpHeaders): Record<string, string> {
  return {
    ...(config.epContextTag ? { "EP-Context-Tag": config.epContextTag } : {}),
    ...(config.environmentId
      ? { "X-REQUEST-ENVIRONMENT-ID": config.environmentId }
      : {}),
    ...(config.storeId ? { "X-REQUEST-STORE-ID": config.storeId } : {}),
  };
}

async function getImplicitToken(
  endpointUrl: string,
  clientId: string,
  config: ExtraEpHeaders,
): Promise<string> {
  const res = await fetch(`https://${endpointUrl}/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...extraHeaders(config),
    },
    body: `grant_type=implicit&client_id=${clientId}`,
    next: { revalidate: 3300 }, // cache slightly under the 1-hour EP token lifetime
  });
  if (!res.ok) throw new Error(`EP token fetch failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

async function getAuthRealmInfo(
  endpointUrl: string,
  accessToken: string,
  config: ExtraEpHeaders,
): Promise<{ realmId: string; realmClientId: string }> {
  const res = await fetch(`https://${endpointUrl}/v2/settings/account-authentication`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...extraHeaders(config),
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`EP account-authentication settings fetch failed: ${res.status}`);
  const data = await res.json();
  return {
    realmId: data.data.relationships.authentication_realm.data.id as string,
    realmClientId: data.data.meta.client_id as string,
  };
}

async function fetchProfileById(
  endpointUrl: string,
  accessToken: string,
  realmId: string,
  realmClientId: string,
  profileId: string,
  config: ExtraEpHeaders,
): Promise<OidcProfileInfo> {
  const res = await fetch(
    `https://${endpointUrl}/v2/authentication-realms/${realmId}/oidc-profiles/${profileId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...extraHeaders(config),
      },
      next: { revalidate: 3600 },
    },
  );
  if (!res.ok) throw new Error(`EP OIDC profile fetch failed for ${profileId}: ${res.status}`);
  const data = await res.json();
  return {
    id: data.data.id as string,
    name: data.data.name as string,
    clientId: realmClientId,
    authorizationEndpoint: data.links["authorization-endpoint"] as string,
  };
}

export async function fetchOidcProfiles(
  profileIds: string[],
  config: { endpointUrl: string; clientId: string } & ExtraEpHeaders,
): Promise<OidcProfileInfo[]> {
  if (!profileIds.length) return [];

  const { endpointUrl, clientId } = config;
  let accessToken: string;
  let realmId: string;
  let realmClientId: string;

  try {
    accessToken = await getImplicitToken(endpointUrl, clientId, config);
    ({ realmId, realmClientId } = await getAuthRealmInfo(endpointUrl, accessToken, config));
  } catch (err) {
    console.error("[OIDC] Failed to fetch auth realm:", err);
    return [];
  }

  const results = await Promise.allSettled(
    profileIds.map((id) =>
      fetchProfileById(endpointUrl, accessToken, realmId, realmClientId, id, config),
    ),
  );

  return results.flatMap((r) => {
    if (r.status === "fulfilled") return [r.value];
    console.error("[OIDC] Failed to fetch profile:", r.reason);
    return [];
  });
}

export async function exchangeOidcCode(params: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  config: EpConnectionConfig;
}): Promise<AccountMemberCredentials> {
  const { code, redirectUri, codeVerifier, config } = params;

  // Same client construction (and same /v2/account-members/tokens call) as
  // password login in auth.ts — the hand-rolled fetch this replaced sent an
  // extra manually-obtained bearer token EPCC's account-management-token
  // endpoint doesn't expect, causing "authentication failed".
  const client = getAuthClient(config);
  const result = await postV2AccountMembersTokens({
    client,
    body: {
      data: {
        type: "account_management_authentication_token",
        authentication_mechanism: "oidc",
        oauth_authorization_code: code,
        oauth_redirect_uri: redirectUri,
        oauth_code_verifier: codeVerifier,
      } as any,
    },
  });
  const credentials = buildCredentials(result);

  const firstToken = Object.values(credentials.accounts)[0]?.token ?? "";
  if (credentials.accountMemberId && firstToken) {
    const profile = await fetchMemberProfile(firstToken, credentials.accountMemberId, config);
    credentials.member_name = profile.name;
    credentials.member_email = profile.email;
  }

  return credentials;
}
