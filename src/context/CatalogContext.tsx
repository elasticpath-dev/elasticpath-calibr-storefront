"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";

type CatalogContextValue = {
  catalogId: string | null;
  isLoading: boolean;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, credentials, isLoading: authLoading } = useAuth();
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Which catalog a shopper resolves to depends on account-scoped catalog
  // rules, so it's fetched once per session/account here (available to
  // Plasmic as a targeting trait) instead of on every page render, and
  // re-fetched only when the signed-in account actually changes.
  useEffect(() => {
    if (authLoading) return; // wait for auth hydration so we don't fetch twice on load
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/catalog-id")
      .then((res) =>
        res.ok ? (res.json() as Promise<{ catalogId: string | null }>) : null,
      )
      .then((data) => {
        if (!cancelled) setCatalogId(data?.catalogId ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, credentials?.selected]);

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
