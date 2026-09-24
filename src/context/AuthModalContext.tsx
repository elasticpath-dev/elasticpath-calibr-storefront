"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AuthModal } from "@/components/auth/AuthModal";

type AuthView = "login" | "signup" | "forgot-password";

type AuthModalContextValue = {
  /** Open the shared login/auth overlay (e.g. from a "Login to see price" button). */
  openAuthModal: (view?: AuthView) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

/**
 * Mounts a single shared AuthModal and exposes an opener, so any component
 * (product cards, PDP, carousels) can trigger the login overlay without each
 * rendering its own modal. Must sit inside AuthProvider (AuthModal uses useAuth).
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AuthView>("login");

  const openAuthModal = useCallback((next: AuthView = "login") => {
    setView(next);
    setOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openAuthModal, closeAuthModal }),
    [openAuthModal, closeAuthModal],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal isOpen={open} onClose={closeAuthModal} initialView={view} />
    </AuthModalContext.Provider>
  );
}

const NOOP_AUTH_MODAL: AuthModalContextValue = {
  openAuthModal: () => {},
  closeAuthModal: () => {},
};

/**
 * Returns the auth-modal opener. Outside a provider (e.g. the Plasmic Studio
 * canvas) it degrades to a no-op instead of throwing, so product components
 * that offer "Login to see price" render safely everywhere.
 */
export function useAuthModal(): AuthModalContextValue {
  return useContext(AuthModalContext) ?? NOOP_AUTH_MODAL;
}
