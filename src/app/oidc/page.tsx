"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { completeOidcLogin } from "./actions";
import {
  AM_CREDENTIALS_STORAGE_KEY,
  AM_TOKEN_COOKIE,
} from "@/context/AuthContext";
import { getStoredOidcState, clearStoredOidcState } from "@/lib/oidc-utils";
import { generateRedirectUri } from "@/lib/oidc-utils";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";

// This route deliberately lives outside [lang] (see proxy.ts matcher — it's
// a static callback URL registered with the identity provider, and prefixing
// it with a locale would 404). That also means it has no NextIntlClientProvider
// from a parent layout — read the locale next-intl's own middleware already
// stashed in a cookie for us (set on whatever /[lang]/... page the shopper
// was on before starting sign-in) and load messages for it client-side.
function readLocaleCookie(): Locale {
  const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
  const value = match?.[1];
  return (locales as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : defaultLocale;
}

function OidcCallback() {
  const t = useTranslations("auth");
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
      setErrorMsg(t("oidcMissingParams"));
      return;
    }

    const { state, codeVerifier, location } = getStoredOidcState();

    if (!state || state !== stateParam) {
      setErrorMsg(t("oidcStateMismatch"));
      clearStoredOidcState();
      return;
    }

    if (!codeVerifier) {
      setErrorMsg(t("oidcMissingVerifier"));
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
        setErrorMsg(err instanceof Error ? err.message : t("oidcSignInFailedGeneric"));
        clearStoredOidcState();
      });
  }, [searchParams, router, t]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-gray-800 mb-2">
            {t("oidcSignInFailedTitle")}
          </p>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <button
            onClick={() => router.replace("/")}
            className="text-sm text-brand-primary hover:underline"
          >
            {t("returnToStore")}
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

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

export default function OidcPage() {
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const resolved = readLocaleCookie();
    setLocale(resolved);
    import(`../../../messages/${resolved}.json`).then((mod) =>
      setMessages(mod.default),
    );
  }, []);

  if (!messages) return <Spinner />;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Suspense fallback={<Spinner />}>
        <OidcCallback />
      </Suspense>
    </NextIntlClientProvider>
  );
}
