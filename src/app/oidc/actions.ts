"use server";

import { getTranslations } from "next-intl/server";
import { getTenantConfig } from "@/lib/tenant-config";
import { exchangeOidcCode } from "@/lib/api/oidc";
import type { AccountMemberCredentials } from "@/lib/api/auth";

export type CompleteOidcLoginResult =
  | { success: true; credentials: AccountMemberCredentials }
  | { success: false; error: string };

// Next.js redacts thrown Server Action errors in production (generic "An
// error occurred in the Server Components render" digest, no message) —
// catching here and returning the real detail as data is the only way the
// client actually sees why sign-in failed.
export async function completeOidcLogin(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<CompleteOidcLoginResult> {
  try {
    const config = await getTenantConfig();
    const credentials = await exchangeOidcCode({
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
    return { success: true, credentials };
  } catch (err) {
    console.error("[OIDC] completeOidcLogin failed:", err);
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    // This route lives outside [lang] (see proxy.ts), so there's no
    // routing-negotiated locale for getTranslations() to resolve from —
    // it falls back to the default locale here, same as the rest of this
    // locale-agnostic page family (/gate, /oidc).
    const t = await getTranslations("auth");
    return { success: false, error: t("oidcSignInFailedGeneric") };
  }
}
