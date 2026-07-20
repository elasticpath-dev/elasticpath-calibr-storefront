"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Client } from "@hey-api/client-fetch";
import { createEpClient, configureEpClient } from "@/lib/api/ep-client";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { useAuth } from "@/context/AuthContext";

// undefined = no provider in tree; null = provider present but the EP client
// is intentionally withheld (marketing mode, signed out).
const ClientContext = createContext<Client | null | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const {
    epccEndpointUrl,
    epccClientId,
    multiLocation,
    epContextTag,
    environmentId,
    storeId,
    marketingMode,
  } = useTenantConfig();
  const { hasSession } = useAuth();

  // In marketing mode, don't create the EP SDK client until sign-in — creating
  // it auto-authenticates (writing _store_ep_credentials) and initialises a
  // cart cookie. Held → null client; the controls that use it are hidden until
  // sign-in anyway. Uses hasSession (cookie-seeded during SSR) so a signed-in
  // shopper isn't treated as anonymous on the first render (which would make
  // client-dependent pages like /search crash server-side).
  const holdApis = marketingMode && !hasSession;

  configureEpClient({
    endpointUrl: epccEndpointUrl,
    clientId: epccClientId,
    multiLocation,
    epContextTag,
    environmentId,
    storeId,
  });
  const client = useMemo(
    () => (holdApis ? null : createEpClient()),
    [holdApis],
  );

  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
}

export function useEpClient(): Client {
  const client = useContext(ClientContext);
  if (client === undefined) {
    throw new Error("useEpClient must be used within <ClientProvider>");
  }
  // May be null while APIs are held (marketing mode, signed out); consumers of
  // this hook are only rendered once signed in, so that's not reached.
  return client as Client;
}
