import type { Preview, Decorator } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
import { CartProvider } from "../src/context/CartContext";
import { AuthProvider } from "../src/context/AuthContext";
import { TenantConfigProvider } from "../src/context/TenantConfigContext";
import {
  buildTenantConfigFromEnv,
  toClientTenantConfig,
} from "../src/lib/tenant-config";
import enMessages from "../messages/en.json";
// @ts-ignore no type declarations for global CSS side-effect import
import "../src/app/globals.css";

// AuthProvider / CartProvider (and others) call useTenantConfig(), so stories
// need TenantConfigProvider. next/headers is mocked in .storybook/main.ts, so
// building the config from env here is safe outside a request context.
const tenantConfig = toClientTenantConfig(buildTenantConfigFromEnv());

const withProviders: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    <TenantConfigProvider value={tenantConfig}>
      <AuthProvider>
        <CartProvider>
          <Story />
        </CartProvider>
      </AuthProvider>
    </TenantConfigProvider>
  </NextIntlClientProvider>
);

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
};

export default preview;
