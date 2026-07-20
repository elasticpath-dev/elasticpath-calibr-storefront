import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { getServerCurrency } from "@/lib/currency-server";
import { ClientProvider } from "@/components/ClientProvider";
import { Toaster } from "sonner";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [messages, currency] = await Promise.all([
    getMessages(),
    getServerCurrency(),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <CurrencyProvider initialCurrency={currency}>
        <AuthProvider>
          <ClientProvider>
            <PreferencesProvider>
              <CatalogProvider>
                <CartProvider>{children}</CartProvider>
              </CatalogProvider>
            </PreferencesProvider>
          </ClientProvider>
        </AuthProvider>
      </CurrencyProvider>
      <Toaster position="top-right" />
    </NextIntlClientProvider>
  );
}
