"use client";

import { useTenantConfig } from "@/context/TenantConfigContext";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";

/**
 * How the Add to Cart control should behave for a product with no price in the
 * selected currency:
 * - "normal"   — price exists; render normally.
 * - "login"    — signed out + loginToSeePrice: show a "Login to see price" button.
 * - "hide"     — hideAddToCartWhenNoPrice: render nothing.
 * - "disabled" — default: render a disabled Add to Cart (with tooltip).
 */
export type PriceGateMode = "normal" | "login" | "hide" | "disabled";

export function usePriceGate(missingPrice: boolean): {
  mode: PriceGateMode;
  openLogin: () => void;
} {
  const { loginToSeePrice, hideAddToCartWhenNoPrice } = useTenantConfig();
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();

  let mode: PriceGateMode = "normal";
  if (missingPrice) {
    if (loginToSeePrice && !isAuthenticated) mode = "login";
    else if (hideAddToCartWhenNoPrice) mode = "hide";
    else mode = "disabled";
  }

  return { mode, openLogin: () => openAuthModal("login") };
}
