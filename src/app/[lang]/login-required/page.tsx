import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { getTenantConfig } from "@/lib/tenant-config";
import { AuthProvider } from "@/context/AuthContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { Logo } from "@/components/header/Logo";
import { LoginGate } from "@/components/auth/LoginGate";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signInRequiredTitle") };
}

// Sibling to (app)/(checkout), not nested in either — this page needs
// AuthProvider (for LoginGate) and CatalogProvider (the Logo can render a
// Plasmic component, and PlasmicContent reads useCatalog for targeting), but
// deliberately none of (app)/layout.tsx's chrome (header, footer, cart, promo
// modal): it's a standalone gate a shopper sees before any of that is relevant.
export default async function LoginRequiredPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { auth } = await getTenantConfig();
  if (!auth.requireLogin) {
    redirect("/");
  }

  const [{ from = "/" }, messages] = await Promise.all([
    searchParams,
    getMessages(),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <CatalogProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            <div className="mb-8">
              <Logo lang={lang} />
            </div>
            <LoginGate from={from.startsWith("/") ? from : "/"} />
          </div>
        </CatalogProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
