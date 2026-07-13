import { configureClient } from "@epcc-sdk/sdks-shopper";
import type { Client } from "@hey-api/client-fetch";
import { AM_CREDENTIALS_STORAGE_KEY } from "@/context/AuthContext";
import type { AccountMemberCredentials } from "./auth";
import { getSelectedCurrency } from "@/lib/currency";

function injectDynamicHeaders(client: Client): void {
  client.interceptors.request.use((request) => {
    // Read per request so long-lived clients (e.g. CartContext) pick up
    // currency changes without a page reload.
    request.headers.set("X-MOLTIN-CURRENCY", getSelectedCurrency());
    try {
      const stored = localStorage.getItem(AM_CREDENTIALS_STORAGE_KEY);
      if (stored) {
        const creds: AccountMemberCredentials = JSON.parse(stored);
        const account = creds.accounts[creds.selected];
        if (
          account &&
          Date.now() < new Date(account.expires).getTime() - 60_000
        ) {
          request.headers.set(
            "EP-Account-Management-Authentication-Token",
            account.token,
          );
        }
      }
    } catch {}
    return request;
  });
}

// Set once per session by <ClientProvider> from the resolved tenant config —
// createEpClient() has ~30 call sites across the app, so this avoids
// threading these values through every one of them. Tenant config doesn't
// change without a fresh page load, so module-level values are safe here.
let epClientConfig = {
  endpointUrl: process.env.NEXT_PUBLIC_EPCC_ENDPOINT_URL ?? "",
  clientId: process.env.NEXT_PUBLIC_EPCC_CLIENT_ID ?? "",
  multiLocationEnabled: false,
  epContextTag: "",
  environmentId: "",
  storeId: "",
};

export function configureEpClient(config: {
  endpointUrl: string;
  clientId: string;
  multiLocation: boolean;
  epContextTag?: string;
  environmentId?: string;
  storeId?: string;
}): void {
  epClientConfig = {
    endpointUrl: config.endpointUrl,
    clientId: config.clientId,
    multiLocationEnabled: config.multiLocation,
    epContextTag: config.epContextTag ?? "",
    environmentId: config.environmentId ?? "",
    storeId: config.storeId ?? "",
  };
}

export function createEpClient(extraHeaders?: Record<string, string>): Client {
  const { client } = configureClient(
    {
      baseUrl: `https://${epClientConfig.endpointUrl}`,
      headers: {
        "X-MOLTIN-CURRENCY": getSelectedCurrency(),
        ...(epClientConfig.multiLocationEnabled
          ? { "EP-Inventories-Multi-Location": "true" }
          : {}),
        ...(epClientConfig.epContextTag
          ? { "EP-Context-Tag": epClientConfig.epContextTag }
          : {}),
        ...(epClientConfig.environmentId
          ? { "X-REQUEST-ENVIRONMENT-ID": epClientConfig.environmentId }
          : {}),
        ...(epClientConfig.storeId
          ? { "X-REQUEST-STORE-ID": epClientConfig.storeId }
          : {}),
        ...extraHeaders,
      },
    },
    {
      clientId: epClientConfig.clientId,
      storage: "localStorage",
    },
  );
  injectDynamicHeaders(client);
  return client;
}
