"use client";

import { useState, useCallback } from "react";
import { checkoutApi, paymentSetup } from "@epcc-sdk/sdks-shopper";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";
import { useTenantConfig } from "@/context/TenantConfigContext";
import type { CheckoutFormData } from "./use-checkout";
import type { BillingAddr } from "./use-ep-stripe-payment";

export function useEpPayPalPayment(
  lang: string,
  savedAddresses: AccountAddressResponse[] = [],
) {
  const t = useTranslations("checkout");
  const { cartId } = useCart();
  const { credentials } = useAuth();
  const { storeName } = useTenantConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = useCallback(
    async (
      formData: CheckoutFormData,
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
        const client = createEpClient();

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
                first_name:
                  formData.shippingAddress!.firstName || formData.firstName,
                last_name:
                  formData.shippingAddress!.lastName || formData.lastName,
                phone_number:
                  formData.shippingAddress!.phone ?? formData.phone ?? "",
                company_name:
                  formData.shippingAddress!.company ?? formData.company ?? "",
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
                  phone_number:
                    primaryAddr.phone_number ?? formData.phone ?? "",
                  company_name:
                    primaryAddr.company_name ?? formData.company ?? "",
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

        const billingAddr = billingAddressOverride
          ? {
              first_name: billingAddressOverride.first_name,
              last_name: billingAddressOverride.last_name,
              company_name: billingAddressOverride.company_name,
              line_1: billingAddressOverride.line_1,
              line_2: billingAddressOverride.line_2,
              city: billingAddressOverride.city,
              postcode: billingAddressOverride.postcode,
              county: billingAddressOverride.county,
              country: billingAddressOverride.country,
              region: billingAddressOverride.region,
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
            };

        const isAccountCheckout = !!credentials?.selected;
        const contactOrCustomer = isAccountCheckout
          ? {
              contact: {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
              },
            }
          : {
              customer: {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
              },
            };

        // 1. Convert cart to order
        const orderRes = await checkoutApi({
          client,
          path: { cartID: cartId },
          body: {
            data: {
              ...contactOrCustomer,
              shipping_address: shippingAddr,
              billing_address: billingAddr,
            } as any,
          },
        });

        const orderId = orderRes.data?.data?.id;
        if (!orderId) throw new Error(t("orderCreationFailed"));

        // 2. Initiate the PayPal payment — EP hands back a redirect_url to
        // PayPal's hosted checkout. The shopper approves there and PayPal
        // sends them back to return_url (or cancel_url), which reuses the
        // same /payment-return page as the Stripe redirect flow.
        const returnUrl = new URL(
          `${window.location.origin}/${lang}/payment-return`,
        );
        returnUrl.searchParams.set("orderId", orderId);
        returnUrl.searchParams.set("paypal", "return");
        const cancelUrl = new URL(
          `${window.location.origin}/${lang}/payment-return`,
        );
        cancelUrl.searchParams.set("orderId", orderId);
        cancelUrl.searchParams.set("paypal", "cancel");

        const paymentRes = await paymentSetup({
          client,
          path: { orderID: orderId },
          body: {
            data: {
              gateway: "paypal_express_checkout",
              method: "purchase",
              options: {
                description: t("paypalDescription"),
                soft_descriptor: storeName,
                application_context: {
                  brand_name: storeName,
                  landing_page: "LOGIN",
                  shipping_preference: "SET_PROVIDED_ADDRESS",
                  user_action: "PAY_NOW",
                  return_url: returnUrl.toString(),
                  cancel_url: cancelUrl.toString(),
                },
              },
            },
          },
        });

        if (paymentRes.error) {
          const detail =
            (paymentRes.error as any)?.errors?.[0]?.detail ??
            JSON.stringify(paymentRes.error);
          throw new Error(detail);
        }

        const redirectUrl = (paymentRes.data?.data as any)?.client_parameters
          ?.redirect_url as string | undefined;
        if (!redirectUrl) throw new Error(t("paymentSetupFailed"));

        // The return page looks up this order's transactions to find the
        // one it needs to confirm (see PaymentReturnContent.tsx) — PayPal's
        // own redirect params don't carry EP's transaction ID.

        // Full browser navigation to PayPal's own domain — the cart is left
        // intact until the shopper actually completes (or cancels) payment
        // on the return page, not cleared here.
        setIsRedirecting(true);
        window.location.href = redirectUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : t("paymentFailed"));
      } finally {
        setIsLoading(false);
      }
    },
    [cartId, lang, savedAddresses, credentials, storeName, t],
  );

  return { processPayment, isLoading, isRedirecting, error };
}
