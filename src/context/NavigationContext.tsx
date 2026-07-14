"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { NavItem } from "@/components/header/navigation/types";
import { useAuth } from "@/context/AuthContext";

type NavigationContextValue = {
  navItems: NavItem[];
  isLoading: boolean;
  error: string | null;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, credentials, isLoading: authLoading } = useAuth();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hierarchies are resolved "by context" and can differ per account (B2B
  // catalog rules), so the nav tree is fetched once per session/account
  // here instead of being rebuilt on every page render, and re-fetched only
  // when the signed-in account actually changes — not on every navigation.
  useEffect(() => {
    if (authLoading) return; // wait for auth hydration so we don't fetch twice on load
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
  }, [authLoading, isAuthenticated, credentials?.selected]);

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
