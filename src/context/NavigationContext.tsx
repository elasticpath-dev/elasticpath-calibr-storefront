"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { NavItem } from "@/components/header/navigation/types";
import { useCatalog } from "@/context/CatalogContext";
import { useAuth } from "@/context/AuthContext";
import { useTenantConfig } from "@/context/TenantConfigContext";

type NavigationContextValue = {
  navItems: NavItem[];
  isLoading: boolean;
  error: string | null;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { catalogId, isLoading: catalogLoading } = useCatalog();
  const { isAuthenticated } = useAuth();
  const { marketingMode } = useTenantConfig();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Marketing mode: no navigation fetch (an EP call) until signed in.
  const holdApis = marketingMode && !isAuthenticated;

  // Navigation is keyed by the resolved catalog, so it's fetched once per
  // catalog and re-fetched only when the catalog changes (login/logout/account
  // switch update the catalog cookie via CatalogContext, then this reacts).
  // Keying off catalogId (rather than the account directly) guarantees the
  // catalog cookie is already refreshed before /api/navigation reads it.
  useEffect(() => {
    if (holdApis) {
      setNavItems([]);
      setIsLoading(false);
      return;
    }
    if (catalogLoading) return; // wait until the catalog is resolved
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetch("/api/navigation")
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to load navigation");
        }
        return json?.data as NavItem[];
      })
      .then((data) => {
        if (!cancelled) setNavItems(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setNavItems([]);
          setError(err instanceof Error ? err.message : "Failed to load navigation");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogLoading, catalogId, holdApis]);

  return (
    <NavigationContext.Provider value={{ navItems, isLoading, error }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return ctx;
}
