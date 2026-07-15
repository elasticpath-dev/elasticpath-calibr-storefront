"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { completeOidcLogin } from "./actions";
import {
  AM_CREDENTIALS_STORAGE_KEY,
  AM_TOKEN_COOKIE,
} from "@/context/AuthContext";
import { getStoredOidcState, clearStoredOidcState } from "@/lib/oidc-utils";
import { generateRedirectUri } from "@/lib/oidc-utils";

function OidcCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");

    if (!code || !stateParam) {
      setErrorMsg("Missing authorization code or state parameter.");
      return;
    }

    const { state, codeVerifier, location } = getStoredOidcState();

    if (!state || state !== stateParam) {
      setErrorMsg("Unable to validate identity. Please try signing in again.");
      clearStoredOidcState();
      return;
    }

    if (!codeVerifier) {
      setErrorMsg("Missing PKCE code verifier. Please try signing in again.");
      clearStoredOidcState();
      return;
    }

    const redirectUri = generateRedirectUri();

    completeOidcLogin(code, redirectUri, codeVerifier)
      .then((result) => {
        if (!result.success) {
          console.error("[OIDC] Token exchange failed:", result.error);
          setErrorMsg(result.error);
          clearStoredOidcState();
          return;
        }

        const { credentials } = result;

        // Store credentials so AuthContext hydrates them on the next page load
        localStorage.setItem(
          AM_CREDENTIALS_STORAGE_KEY,
          JSON.stringify(credentials),
        );

        // Mirror the AM token as a cookie (same pattern as AuthContext.setAmTokenCookie)
        const selectedAccount = credentials.accounts[credentials.selected];
        if (selectedAccount) {
          const expDate = new Date(selectedAccount.expires);
          document.cookie = `${AM_TOKEN_COOKIE}=${selectedAccount.token}; path=/; expires=${expDate.toUTCString()}; SameSite=Strict`;
        }

        clearStoredOidcState();
        router.replace(location || "/");
      })
      .catch((err) => {
        console.error("[OIDC] Token exchange failed:", err);
        setErrorMsg(
          err instanceof Error ? err.message : "Sign-in failed. Please try again.",
        );
        clearStoredOidcState();
      });
  }, [searchParams, router]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-gray-800 mb-2">
            Sign-in failed
          </p>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <button
            onClick={() => router.replace("/")}
            className="text-sm text-brand-primary hover:underline"
          >
            Return to store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

export default function OidcPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <OidcCallback />
    </Suspense>
  );
}
