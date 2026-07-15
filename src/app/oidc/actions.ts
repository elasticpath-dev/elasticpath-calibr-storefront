"use server";

import { getTenantConfig } from "@/lib/tenant-config";
import { exchangeOidcCode } from "@/lib/api/oidc";
import type { AccountMemberCredentials } from "@/lib/api/auth";

export async function completeOidcLogin(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<AccountMemberCredentials> {
  const config = await getTenantConfig();
  return exchangeOidcCode({
    code,
    redirectUri,
    codeVerifier,
    config: {
      endpointUrl: config.epcc.endpointUrl,
      clientId: config.epcc.clientId,
      epContextTag: config.requestHeaders.epContextTag,
      environmentId: config.requestHeaders.environmentId,
      storeId: config.requestHeaders.storeId,
    },
  });
}
