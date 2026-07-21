"use client";

import { useState, useCallback } from "react";
import { checkoutApi, paymentSetup } from "@epcc-sdk/sdks-shopper";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";
import { isManualGatewayDisabledError } from "@/lib/manual-payment-error";
import type { CheckoutFormData } from "./use-checkout";
import type { BillingAddr } from "./use-ep-stripe-payment";

export function useEpPOPayment(
  lang: string,
  savedAddresses: AccountAddressResponse[] = [],
) {
  const t = useTranslations("checkout");
  const { cartId, clearCart, syncItemLocations } = useCart();
  const { credentials } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = useCallback(
    async (
      formData: CheckoutFormData,
      poNumber: string,
      billingAddressOverride?: BillingAddr | null,
      isDigitalOrder?: boolean,
    ) => {
      if (!cartId) {
        setError(t("noCartError"));
        return;
      }
      if (!poNumber.trim()) {
        setError(t("poNumberRequired"));
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

        // Multi-location: shipping-group updates may have cleared each line's
        // top-level location; re-assert it before the order allocates stock.
        await syncItemLocations();

        const orderRes = await checkoutApi({
          client,
          path: { cartID: cartId },
          body: {
            data: {
              ...contactOrCustomer,
              shipping_address: shippingAddr,
              billing_address: billingAddr,
              purchase_order_number: poNumber.trim(),
            } as any,
          },
        });

        const orderId = orderRes.data?.data?.id;
        if (!orderId) throw new Error(t("orderCreationFailed"));

        // Purchase Order is a manual payment method — no external gateway,
        // so this immediately records the transaction against the order
        // rather than round-tripping with a processor like Stripe.
        const paymentRes = await paymentSetup({
          client,
          path: { orderID: orderId },
          body: {
            data: {
              gateway: "manual",
              method: "authorize",
              paymentmethod_meta: {
                name: "Purchase Order",
                custom_reference: poNumber.trim(),
              },
            },
          },
        });
        if (paymentRes.error) {
          if (isManualGatewayDisabledError(paymentRes.error)) {
            throw new Error(t("manualGatewayDisabled"));
          }
          throw new Error(t("paymentSetupFailed"));
        }

        setIsRedirecting(true);
        router.push(`/${lang}/order-confirmation/${orderId}`);
        await clearCart();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("paymentFailed"));
      } finally {
        setIsLoading(false);
      }
    },
    [cartId, clearCart, router, lang, savedAddresses, credentials, t, syncItemLocations],
  );

  return { processPayment, isLoading, isRedirecting, error };
}
