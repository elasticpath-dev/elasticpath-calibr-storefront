"use client";

import {
  Fragment,
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { setSelectedCurrency, configureCurrencyDefaults } from "@/lib/currency";
import { useTenantConfig } from "@/context/TenantConfigContext";

type CurrencyContextValue = {
  currency: string;
  changeCurrency: (code: string) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialCurrency,
  children,
}: {
  initialCurrency: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { currency: tenantCurrency } = useTenantConfig();
  configureCurrencyDefaults(tenantCurrency);
  const [currency, setCurrency] = useState(initialCurrency);

  const changeCurrency = (code: string) => {
    setSelectedCurrency(code);
    setCurrency(code);
    // Refresh re-fetches server components with the new currency cookie;
    // the key below remounts client components so mount-time fetches
    // re-run too — mirroring what a locale navigation does.
    router.refresh();
  };

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency }}>
      <Fragment key={currency}>{children}</Fragment>
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
