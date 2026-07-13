"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useTenantConfig } from "@/context/TenantConfigContext";

export type CartMode = "drawer" | "full";
export type ShoppingMode = "b2c" | "b2b";

export const COOKIE_CART_MODE = "ep_cart_mode";
export const COOKIE_SHOPPING_MODE = "ep_shopping_mode";

// Fallback used only outside <PreferencesProvider> (createContext default) —
// the provider itself always sources its real defaults from useTenantConfig().
const FALLBACK_CART_MODE: CartMode = "drawer";
const FALLBACK_SHOPPING_MODE: ShoppingMode = "b2c";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

type PreferencesValue = {
  cartMode: CartMode;
  shoppingMode: ShoppingMode;
  /** False until the cookie values have been read on the client. */
  isHydrated: boolean;
  /** True when the store is Elastic Path–hosted — shopping mode is fixed to B2C. */
  shoppingModeLocked: boolean;
  setCartMode: (mode: CartMode) => void;
  setShoppingMode: (mode: ShoppingMode) => void;
};

const PreferencesContext = createContext<PreferencesValue>({
  cartMode: FALLBACK_CART_MODE,
  shoppingMode: FALLBACK_SHOPPING_MODE,
  isHydrated: true,
  shoppingModeLocked: false,
  setCartMode: () => {},
  setShoppingMode: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { defaultCartMode, defaultShoppingMode, shoppingModeLocked } =
    useTenantConfig();
  const [cartMode, setCartModeState] = useState<CartMode>(defaultCartMode);
  const [shoppingMode, setShoppingModeState] = useState<ShoppingMode>(
    shoppingModeLocked ? "b2c" : defaultShoppingMode,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from cookies after mount
  useEffect(() => {
    const cm = readCookie(COOKIE_CART_MODE) as CartMode | null;
    if (cm) setCartModeState(cm);
    // Locked stores ignore any previously saved shopping-mode cookie.
    if (!shoppingModeLocked) {
      const sm = readCookie(COOKIE_SHOPPING_MODE) as ShoppingMode | null;
      if (sm) setShoppingModeState(sm);
    }
    setIsHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCartMode = (mode: CartMode) => {
    writeCookie(COOKIE_CART_MODE, mode);
    setCartModeState(mode);
  };

  const setShoppingMode = (mode: ShoppingMode) => {
    if (shoppingModeLocked) return;
    writeCookie(COOKIE_SHOPPING_MODE, mode);
    setShoppingModeState(mode);
  };

  return (
    <PreferencesContext.Provider
      value={{
        cartMode,
        shoppingMode,
        isHydrated,
        shoppingModeLocked,
        setCartMode,
        setShoppingMode,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  return useContext(PreferencesContext);
}
