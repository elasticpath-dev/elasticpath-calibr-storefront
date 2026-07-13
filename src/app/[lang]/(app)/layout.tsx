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

  return (
    <NextIntlClientProvider messages={messages}>
      <CurrencyProvider initialCurrency={currency}>
      <ClientProvider>
        <PreferencesProvider>
          <AuthProvider>
            <NavigationProvider>
            <CatalogProvider>
            <CartProvider>
            {children}
            <FooterSection lang={lang} />
            <PromotionSuggestionsModal lang={lang} />
            <Toaster position="bottom-right" richColors />
            </CartProvider>
            </CatalogProvider>
            </NavigationProvider>
          </AuthProvider>
        </PreferencesProvider>
      </ClientProvider>
      </CurrencyProvider>
    </NextIntlClientProvider>
  );
}
