"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { CheckoutForm } from "./CheckoutForm";
import { OrderSummary } from "./OrderSummary";
import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/hooks/use-checkout";
import { useAccountAddresses } from "@/hooks/use-account-addresses";

type Props = { lang: string };

export function CheckoutPageContent({ lang }: Props) {
  const t = useTranslations("checkout");
  const { items, cartTotal, cartTotalAmount, cartSubtotal, cartShipping, cartShippingAmount, cartTax } = useCart();
  const { addresses } = useAccountAddresses();
  const { submitCheckout, isLoading, error } = useCheckout(lang, addresses);

  // Aggregate split-shipment duplicate lines into one row per product so the
  // Order Summary is not altered by shipment split operations.
  const aggregatedItems = Object.values(
    items.reduce<Record<string, typeof items[0]>>((acc, item) => {
      // custom_item rows have no productId — key on the cart item's own id
      // instead so distinct custom items never collapse into one another.
      const key = item.productId || item.id;
      if (acc[key]) {
        const existing = acc[key];
        const totalQty = existing.quantity + item.quantity;
        const totalCents = existing.unitPriceAmount * totalQty;
        acc[key] = {
          ...existing,
          quantity: totalQty,
          lineTotalFormatted: new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: existing.currency,
          }).format(totalCents / 100),
        };
      } else {
        acc[key] = { ...item };
      }
      return acc;
    }, {})
  );

  if (items.length === 0) {
    return (
      <main className="container-shell px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <ShoppingBag size={28} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("emptyCart")}</h1>
        <p className="text-gray-500 mb-8">{t("emptyCartSubtitle")}</p>
        <Link
          href={`/${lang}`}
          className="inline-flex items-center px-6 py-3 rounded-lg bg-brand-primary text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          {t("continueShopping")}
        </Link>
      </main>
    );
  }

  return (
    <main className="container-shell px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
        <CheckoutForm
          onSubmit={submitCheckout}
          isLoading={isLoading}
          error={error}
          savedAddresses={addresses}
        />
        <div className="lg:sticky lg:top-8">
          <OrderSummary
            items={aggregatedItems}
            cartTotal={cartTotal}
            cartTotalAmount={cartTotalAmount}
            cartSubtotal={cartSubtotal}
            cartShipping={cartShipping}
            cartShippingAmount={cartShippingAmount}
            cartTax={cartTax}
          />
        </div>
      </div>
    </main>
  );
}
