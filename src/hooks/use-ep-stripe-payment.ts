"use client";

import { useState, useCallback } from "react";
import {
  checkoutApi,
  paymentSetup,
  confirmPayment,
  getV2AccountsAccountId,
} from "@epcc-sdk/sdks-shopper";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";
import { getStripeGateway } from "@/lib/stripe";
import { useTenantConfig } from "@/context/TenantConfigContext";
import type { CheckoutFormData } from "./use-checkout";

export type BillingAddr = {
  first_name: string;
  last_name: string;
  company_name?: string;
  line_1: string;
  line_2?: string;
  city: string;
  postcode: string;
  county?: string;
  country: string;
  region?: string;
};

export function useEpStripePayment(
  lang: string,
  savedAddresses: AccountAddressResponse[] = []
) {
  const t = useTranslations("checkout");
  const { cartId, clearCart, items } = useCart();
  const { credentials } = useAuth();
  const { stripeAccountId } = useTenantConfig();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = useCallback(
    async (
      formData: CheckoutFormData,
      stripe: Stripe,
      elements: StripeElements,
      billingAddressOverride?: BillingAddr | null,
      isDigitalOrder?: boolean,
    ) => {
      if (!cartId) {
        setError(t("noCartError"));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Validate Stripe Elements before starting any server calls
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setError(submitError.message ?? t("paymentValidationFailed"));
          return;
        }

        const client = createEpClient();

        // Derive shipping address: prefer form data, fall back to first account address
        const primaryAddr = savedAddresses[0];
        const fromForm = formData.shippingAddress?.line1;

        // Digital-only orders (B2C) have no delivery address to collect —
        // EP still requires the field, so every part is sent as a single space.
        const shippingAddr = isDigitalOrder
          ? {
              first_name: " ",
              last_name: " ",
              phone_number: " ",
              company_name: " ",
              line_1: " ",
              line_2: " ",
              city: " ",
              postcode: " ",
              county: " ",
              country: " ",
              region: " ",
              instructions: " ",
            }
          : fromForm
          ? {
              first_name: formData.shippingAddress!.firstName || formData.firstName,
              last_name: formData.shippingAddress!.lastName || formData.lastName,
              phone_number: formData.shippingAddress!.phone ?? formData.phone ?? "",
              company_name: formData.shippingAddress!.company ?? formData.company ?? "",
              line_1: formData.shippingAddress!.line1,
              line_2: formData.shippingAddress!.line2 ?? "",
              city: formData.shippingAddress!.city,
              postcode: formData.shippingAddress!.postcode,
              county: formData.shippingAddress!.county ?? "",
              country: formData.shippingAddress!.country,
              region: formData.shippingAddress!.region ?? "",
              instructions: "",
            }
          : primaryAddr
          ? {
              first_name: primaryAddr.first_name ?? formData.firstName,
              last_name: primaryAddr.last_name ?? formData.lastName,
              phone_number: primaryAddr.phone_number ?? formData.phone ?? "",
              company_name: primaryAddr.company_name ?? formData.company ?? "",
              line_1: primaryAddr.line_1 ?? "",
              line_2: primaryAddr.line_2 ?? "",
              city: primaryAddr.city ?? "",
              postcode: primaryAddr.postcode ?? "",
              county: primaryAddr.county ?? "",
              country: primaryAddr.country ?? "",
              region: primaryAddr.region ?? "",
              instructions: "",
            }
          : {
              first_name: formData.firstName,
              last_name: formData.lastName,
              phone_number: formData.phone ?? "",
              company_name: formData.company ?? "",
              line_1: "-",
              line_2: "",
              city: "-",
              postcode: "-",
              county: "",
              country: "US",
              region: "",
              instructions: "",
            };

        const isAccountCheckout = !!credentials?.selected;
        const contactOrCustomer = isAccountCheckout
          ? { contact: { name: `${formData.firstName} ${formData.lastName}`, email: formData.email } }
          : { customer: { name: `${formData.firstName} ${formData.lastName}`, email: formData.email } };

        // 1. Convert cart to order
        const orderRes = await checkoutApi({
          client,
          path: { cartID: cartId },
          body: {
            data: {
              ...contactOrCustomer,
              shipping_address: shippingAddr,
              billing_address: billingAddressOverride
                ? {
                    first_name: billingAddressOverride.first_name,
                    last_name: billingAddressOverride.last_name,
                    company_name: billingAddressOverride.company_name ?? "",
                    line_1: billingAddressOverride.line_1,
                    line_2: billingAddressOverride.line_2 ?? "",
                    city: billingAddressOverride.city,
                    postcode: billingAddressOverride.postcode,
                    county: billingAddressOverride.county ?? "",
                    country: billingAddressOverride.country,
                    region: billingAddressOverride.region ?? "",
                  }
                : {
                    first_name: shippingAddr.first_name,
                    last_name: shippingAddr.last_name,
                    company_name: shippingAddr.company_name,
                    line_1: shippingAddr.line_1,
                    line_2: shippingAddr.line_2,
                    city: shippingAddr.city,
                    postcode: shippingAddr.postcode,
                    county: shippingAddr.county,
                    country: shippingAddr.country,
                    region: shippingAddr.region,
                  },
            },
          },
        });

        const orderId = orderRes.data?.data?.id;
        if (!orderId) throw new Error(t("orderCreationFailed"));

        // 2. If the cart contains subscription items, fetch the account's stripe_customer_id
        // so Stripe can attach the PaymentMethod for future off-session charges.
        let stripeCustomerId: string | undefined;
        const hasSubscription = items.some((i) => i.isSubscription);
        if (hasSubscription && credentials?.selected) {
          try {
            const accountRes = await getV2AccountsAccountId({
              client,
              path: { accountID: credentials.selected },
            });
            stripeCustomerId = (accountRes.data?.data as any)?.stripe_customer_id as string | undefined;
          } catch {
            // Non-fatal — proceed without customer ID
          }
        }

        // 3. Initiate payment via EP — EP creates the PaymentIntent server-side.
        // Gateway is determined by env: elastic_path_payments_stripe (EP Payments, needs account ID)
        // or stripe_payment (merchant's own Stripe account).
        const paymentRes = await paymentSetup({
          client,
          path: { orderID: orderId },
          body: {
            data: {
              gateway: getStripeGateway(stripeAccountId),
              method: "purchase",
              ...(stripeCustomerId ? {
                options: {
                  customer: stripeCustomerId,
                  setup_future_usage: "off_session",
                },
              } : {}),
            } as any,
          },
        });

        const transactionId = paymentRes.data?.data?.id;
        // EP Payments returns client_secret nested under payment_intent;
        // standard stripe_payment gateway may return it at the top level.
        const paymentData = paymentRes.data?.data as any;
        const clientSecret = (paymentData?.payment_intent?.client_secret ??
          paymentData?.client_secret) as string | undefined;

        if (!clientSecret) {
          throw new Error(t("paymentSetupFailed"));
        }

        // 4. Confirm payment with Stripe using the client secret from EP.
        // return_url is required for automatic payment methods (Klarna, Clearpay, 3DS redirects).
        // For standard card payments redirect:"if_required" means this URL is never visited.
        // Redirect-based methods land on /payment-return which confirms with EP and clears the cart.
        const returnUrl = new URL(`${window.location.origin}/${lang}/payment-return`);
        returnUrl.searchParams.set("orderId", orderId);
        if (transactionId) returnUrl.searchParams.set("transactionId", transactionId);

        const { error: stripeError } = await stripe.confirmPayment({
          elements,
          clientSecret,
          redirect: "if_required",
          confirmParams: {
            return_url: returnUrl.toString(),
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message ?? t("paymentConfirmFailed"));
        }

        // 5. Confirm the transaction with EP to sync payment status
        if (transactionId) {
          await confirmPayment({
            client,
            path: { orderID: orderId, transactionID: transactionId },
            body: { data: {} },
          }).catch(() => {
            // Non-fatal: EP will reconcile via Stripe webhook
          });
        }

        setIsRedirecting(true);
        router.push(`/${lang}/order-confirmation/${orderId}`);
        await clearCart();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("paymentFailed")
        );
      } finally {
        setIsLoading(false);
      }
    },
    [cartId, clearCart, items, router, lang, savedAddresses, credentials, t, stripeAccountId]
  );

  return { processPayment, isLoading, isRedirecting, error };
}
