"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantConfig } from "@/context/TenantConfigContext";

// Kept as a literal (not imported from the server-only catalog module, which
// pulls in next/headers) — mirrors how AM_TOKEN_COOKIE is duplicated.
const CATALOG_ID_COOKIE = "ep_catalog_id";

type CatalogContextValue = {
  catalogId: string | null;
  isLoading: boolean;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

// The resolved catalog is kept in a cookie so the server (navigation, etc.)
// reuses it without re-resolving on every request. Only written here — on
// first load and whenever auth/account changes (this effect's deps).
function writeCatalogCookie(id: string | null) {
  if (id) {
    document.cookie = `${CATALOG_ID_COOKIE}=${id}; path=/; max-age=31536000; SameSite=Strict`;
  } else {
    document.cookie = `${CATALOG_ID_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasSession, credentials, isLoading: authLoading } =
    useAuth();
  const { marketingMode } = useTenantConfig();
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Marketing mode: don't resolve a catalog (an EP call) until signed in.
  const holdApis = marketingMode && !hasSession;

  // Which catalog a shopper resolves to depends on account-scoped catalog
  // rules, so it's resolved once here and cached in a cookie, re-fetched only
  // when the signed-in account actually changes (login/logout/switch). The
  // cookie is refreshed on every run so a stale one from a prior account is
  // replaced before navigation (which reads it) picks it up.
  useEffect(() => {
    if (authLoading) return; // wait for auth hydration so we don't fetch twice on load
    if (holdApis) {
      // Held (marketing mode, signed out): no EP call, clear any stale cookie.
      writeCatalogCookie(null);
      setCatalogId(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/catalog-id")
      .then((res) =>
        res.ok ? (res.json() as Promise<{ catalogId: string | null }>) : null,
      )
      .then((data) => {
        if (cancelled) return;
        const id = data?.catalogId ?? null;
        writeCatalogCookie(id); // set BEFORE state so nav reads the fresh value
        setCatalogId(id);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, credentials?.selected, holdApis]);

  return (
    <CatalogContext.Provider value={{ catalogId, isLoading }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return ctx;
}
