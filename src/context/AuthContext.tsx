"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  loginWithAccountManagement,
  registerWithAccountManagement,
  requestPasswordReset,
  type AccountMemberCredentials,
  type AccountMemberCredential,
} from "@/lib/api/auth";
import { clearSession } from "@/lib/clear-session";
import { identifyUser, resetAnalyticsUser } from "@/lib/analytics";
import { useTenantConfig } from "@/context/TenantConfigContext";

export const AM_CREDENTIALS_STORAGE_KEY = "ep_account_member_credentials";
export const AM_TOKEN_COOKIE = "ep_am_token";

function setAmTokenCookie(token: string, expires: string) {
  const expDate = new Date(expires);
  document.cookie = `${AM_TOKEN_COOKIE}=${token}; path=/; expires=${expDate.toUTCString()}; SameSite=Strict`;
}

function clearAmTokenCookie() {
  document.cookie = `${AM_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

type AuthContextValue = {
  credentials: AccountMemberCredentials | null;
  selectedAccount: AccountMemberCredential | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  selectAccount: (accountId: string) => void;
  logout: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getSelectedAccount(
  credentials: AccountMemberCredentials | null
): AccountMemberCredential | null {
  if (!credentials) return null;
  return credentials.accounts[credentials.selected] ?? null;
}

function isCredentialsExpired(credentials: AccountMemberCredentials): boolean {
  const account = credentials.accounts[credentials.selected];
  if (!account) return true;
  return Date.now() >= new Date(account.expires).getTime() - 60_000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    passwordProfileId,
    epccEndpointUrl,
    epccClientId,
    epContextTag,
    environmentId,
    storeId,
  } = useTenantConfig();
  const [credentials, setCredentials] =
    useState<AccountMemberCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Hydrate from localStorage on mount — isLoading stays true until this completes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AM_CREDENTIALS_STORAGE_KEY);
      if (stored) {
        const parsed: AccountMemberCredentials = JSON.parse(stored);
        if (!isCredentialsExpired(parsed)) {
          setCredentials(parsed);
          const acc = parsed.accounts[parsed.selected];
          if (acc) setAmTokenCookie(acc.token, acc.expires);
        } else {
          localStorage.removeItem(AM_CREDENTIALS_STORAGE_KEY);
          clearAmTokenCookie();
        }
      }
    } catch {}
    setIsLoading(false);
  }, []);

  const persistCredentials = useCallback(
    (creds: AccountMemberCredentials) => {
      localStorage.setItem(AM_CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
      const acc = creds.accounts[creds.selected];
      if (acc) setAmTokenCookie(acc.token, acc.expires);
      setCredentials(creds);
      if (creds.accountMemberId) {
        identifyUser(creds.accountMemberId, {
          email: creds.member_email,
          name: creds.member_name,
        });
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const creds = await loginWithAccountManagement(
        email,
        password,
        passwordProfileId,
        {
          endpointUrl: epccEndpointUrl,
          clientId: epccClientId,
          epContextTag,
          environmentId,
          storeId,
        },
      );
      persistCredentials(creds);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    persistCredentials,
    router,
    passwordProfileId,
    epccEndpointUrl,
    epccClientId,
    epContextTag,
    environmentId,
    storeId,
  ]);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const creds = await registerWithAccountManagement(
          name,
          email,
          password,
          passwordProfileId,
          {
            endpointUrl: epccEndpointUrl,
            clientId: epccClientId,
            epContextTag,
            environmentId,
            storeId,
          },
        );
        persistCredentials(creds);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Registration failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      persistCredentials,
      router,
      passwordProfileId,
      epccEndpointUrl,
      epccClientId,
      epContextTag,
      environmentId,
      storeId,
    ]
  );

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectAccount = useCallback(
    (accountId: string) => {
      if (!credentials || !credentials.accounts[accountId]) return;
      const updated = { ...credentials, selected: accountId };
      localStorage.setItem(AM_CREDENTIALS_STORAGE_KEY, JSON.stringify(updated));
      const acc = updated.accounts[accountId];
      if (acc) setAmTokenCookie(acc.token, acc.expires);
      setCredentials(updated);
      router.refresh();
    },
    [credentials, router]
  );

  const logout = useCallback(() => {
    clearSession();
    setCredentials(null);
    resetAnalyticsUser();
    router.refresh();
  }, [router]);

  const clearError = useCallback(() => setError(null), []);

  const selectedAccount = getSelectedAccount(credentials);

  return (
    <AuthContext.Provider
      value={{
        credentials,
        selectedAccount,
        isAuthenticated: selectedAccount !== null,
        isLoading,
        error,
        login,
        register,
        forgotPassword,
        selectAccount,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
