import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { getServerCurrency } from "@/lib/currency-server";
import { FooterSection } from "@/components/footer/FooterSection";
import { ClientProvider } from "@/components/ClientProvider";
import { Toaster } from "sonner";
import { PromotionSuggestionsModal } from "@/components/cart/PromotionSuggestionsModal";
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const [messages, { lang }, currency] = await Promise.all([
    getMessages(),
    params,
    getServerCurrency(),
  ]);
  const initialSignedIn = !!(await cookies()).get("ep_am_token")?.value;

  return (
    <NextIntlClientProvider messages={messages}>
      <CurrencyProvider initialCurrency={currency}>
      {/* AuthProvider wraps ClientProvider so the EP SDK client (which
          auto-authenticates and creates _store_ep_credentials / the cart
          cookie) can be withheld in marketing mode until sign-in. */}
      <AuthProvider initialSignedIn={initialSignedIn}>
        <ClientProvider>
          <PreferencesProvider>
            <CatalogProvider>
            <NavigationProvider>
            <CartProvider>
            {children}
            <FooterSection lang={lang} />
            <PromotionSuggestionsModal lang={lang} />
            <Toaster position="bottom-right" richColors />
            </CartProvider>
            </NavigationProvider>
            </CatalogProvider>
          </PreferencesProvider>
        </ClientProvider>
      </AuthProvider>
      </CurrencyProvider>
    </NextIntlClientProvider>
  );
}
