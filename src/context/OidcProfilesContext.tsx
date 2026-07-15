"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OidcProfileInfo } from "@/lib/api/oidc";

const OidcProfilesContext = createContext<OidcProfileInfo[]>([]);

export function OidcProfilesProvider({
  value,
  children,
}: {
  value: OidcProfileInfo[];
  children: ReactNode;
}) {
  return (
    <OidcProfilesContext.Provider value={value}>
      {children}
    </OidcProfilesContext.Provider>
  );
}

export function useOidcProfiles(): OidcProfileInfo[] {
  return useContext(OidcProfilesContext);
}
