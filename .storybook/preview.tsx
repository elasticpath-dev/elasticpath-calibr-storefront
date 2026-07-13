import type { Preview, Decorator } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
import { CartProvider } from "../src/context/CartContext";
import { AuthProvider } from "../src/context/AuthContext";
import enMessages from "../messages/en.json";
import "../src/app/globals.css";

const withProviders: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    <AuthProvider>
      <CartProvider>
        <Story />
      </CartProvider>
    </AuthProvider>
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
