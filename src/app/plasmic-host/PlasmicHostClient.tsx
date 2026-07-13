"use client";

import { getClientPlasmicLoader } from "@/components/plasmic/plasmic-loader";
import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";
import { NextIntlClientProvider } from "next-intl";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { TenantConfigProvider } from "@/context/TenantConfigContext";
import type { ClientTenantConfig } from "@/lib/tenant-config";
import enMessages from "../../../messages/en.json";

export function PlasmicHostClient({
  clientTenantConfig,
}: {
  clientTenantConfig: ClientTenantConfig;
}) {
  // Registers components too, on first creation of this tenant's loader.
  const loader = getClientPlasmicLoader(clientTenantConfig.cms);
  if (!loader) {
    return (
      <p style={{ padding: "2rem", fontFamily: "monospace" }}>
        Elastic Path CMS is not configured for this domain&apos;s tenant. Set
        cms.projectId / cms.apiToken in the tenant config (or
        NEXT_PUBLIC_EP_CMS_PROJECT_ID / NEXT_PUBLIC_EP_CMS_API_TOKEN when not
        running in multi-tenant mode).
      </p>
    );
  }

  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TenantConfigProvider value={clientTenantConfig}>
        <AuthProvider>
          <CartProvider>
            <PlasmicCanvasHost />
          </CartProvider>
        </AuthProvider>
      </TenantConfigProvider>
    </NextIntlClientProvider>
  );
}
