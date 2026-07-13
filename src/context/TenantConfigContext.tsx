"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ClientTenantConfig } from "@/lib/tenant-config";

const TenantConfigContext = createContext<ClientTenantConfig | null>(null);

export function TenantConfigProvider({
  value,
  children,
}: {
  value: ClientTenantConfig;
  children: ReactNode;
}) {
  return <TenantConfigContext.Provider value={value}>{children}</TenantConfigContext.Provider>;
}

export function useTenantConfig(): ClientTenantConfig {
  const ctx = useContext(TenantConfigContext);
  if (!ctx) throw new Error("useTenantConfig must be used within TenantConfigProvider");
  return ctx;
}
