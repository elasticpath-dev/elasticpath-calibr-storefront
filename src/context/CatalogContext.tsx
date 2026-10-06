"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTenantConfig } from "@/context/TenantConfigContext";

// Kept as a literal (not imported from the server-only catalog module, which
// pulls in next/headers) — mirrors how AM_TOKEN_COOKIE is duplicated.
const CATALOG_ID_COOKIE = "ep_catalog_id";
// The signed-in account's currency (flow field). Duplicated literal of
// ACCOUNT_CURRENCY_COOKIE_KEY in src/lib/currency.ts for the same reason.
const ACCOUNT_CURRENCY_COOKIE = "ep_account_currency";

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

function writeAccountCurrencyCookie(currency: string | null) {
  if (currency) {
    document.cookie = `${ACCOUNT_CURRENCY_COOKIE}=${currency}; path=/; max-age=31536000; SameSite=Strict`;
  } else {
    document.cookie = `${ACCOUNT_CURRENCY_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasSession, credentials, isLoading: authLoading } =
    useAuth();
  const { marketingMode } = useTenantConfig();
  const router = useRouter();
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // The account we last resolved for. `undefined` = not resolved yet (initial
  // load), so the first resolution doesn't trigger an extra refresh.
  const prevAccountRef = useRef<string | undefined>(undefined);

  // Marketing mode: don't resolve a catalog (an EP call) until signed in.
  const holdApis = marketingMode && !hasSession;

  // Which catalog a shopper resolves to depends on account-scoped catalog
  // rules, so it's resolved once here and cached in a cookie, re-fetched only
  // when the signed-in account actually changes (login/logout/switch). The
  // cookie is refreshed on every run so a stale one from a prior account is
  // replaced before navigation (which reads it) picks it up.
  useEffect(() => {
    if (authLoading) return; // wait for auth hydration so we don't fetch twice on load

    // The same catalog id can back different accounts with different catalog
    // rules (pricing, product visibility), so a refresh must key on the ACCOUNT
    // changing, not the catalog id. Fires after the catalog re-resolves — which
    // re-establishes the account context server-side — so the soft refresh then
    // renders the new account's rules. Skips the initial resolve.
    const account = credentials?.selected ?? "__anon__";
    const maybeRefresh = () => {
      const prev = prevAccountRef.current;
      prevAccountRef.current = account;
      if (prev !== undefined && prev !== account) router.refresh();
    };

    if (holdApis) {
      // Held (marketing mode, signed out): no EP call, clear any stale cookies.
      writeCatalogCookie(null);
      writeAccountCurrencyCookie(null);
      setCatalogId(null);
      setIsLoading(false);
      maybeRefresh();
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    // Resolve catalog AND the account's currency together, then refresh once so
    // server components render under the new account's catalog rules and its
    // currency (both cookies are fresh before the refresh fires).
    void (async () => {
      try {
        const res = await fetch("/api/catalog-id");
        const data = res.ok
          ? ((await res.json()) as { catalogId: string | null })
          : null;
        if (cancelled) return;
        const id = data?.catalogId ?? null;
        writeCatalogCookie(id); // set BEFORE state so nav reads the fresh value
        setCatalogId(id);
      } catch {
        // ignore — keep whatever catalog cookie exists
      }

      // The account's currency flow field (signed out → clear → default applies).
      let currency: string | null = null;
      const accountId = isAuthenticated ? credentials?.selected : undefined;
      if (accountId) {
        try {
          const cres = await fetch(
            `/api/account-currency?accountId=${encodeURIComponent(accountId)}`,
          );
          const cdata = cres.ok
            ? ((await cres.json()) as { currency: string | null })
            : null;
          currency = cdata?.currency ?? null;
        } catch {
          // ignore — fall back to default currency
        }
      }
      if (cancelled) return;
      writeAccountCurrencyCookie(currency);

      setIsLoading(false);
      maybeRefresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, credentials?.selected, holdApis, router]);

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
