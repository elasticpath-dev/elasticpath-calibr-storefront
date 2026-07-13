"use client";

import { useState, useCallback } from "react";
import { checkoutApi } from "@epcc-sdk/sdks-shopper";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";

export type AddressData = {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  county?: string;
  country: string;
  region?: string;
  // Recipient details — B2C checkout fills these from the confirmed
  // delivery address; when absent the contact fields are used instead.
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
};

export type CheckoutFormData = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  // Address fields kept so AddressFields.tsx still compiles; no longer rendered in form
  shippingAddress?: AddressData;
  sameBillingAsShipping?: boolean;
  billingAddress?: AddressData;
  billingFirstName?: string;
  billingLastName?: string;
  billingCompany?: string;
};

export function useCheckout(lang: string, savedAddresses: AccountAddressResponse[] = []) {
  const { cartId, clearCart } = useCart();
  const { credentials } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCheckout = useCallback(
    async (data: CheckoutFormData) => {
      if (!cartId) {
        setError("No active cart found. Please add items before checking out.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const client = createEpClient();

        // Derive shipping address: prefer form data, fall back to first account address
        const primaryAddr = savedAddresses[0];
        const fromForm = data.shippingAddress?.line1;

        const shippingAddr = fromForm
          ? {
              first_name: data.firstName,
              last_name: data.lastName,
              phone_number: data.phone ?? "",
              company_name: data.company ?? "",
              line_1: data.shippingAddress!.line1,
              line_2: data.shippingAddress!.line2 ?? "",
              city: data.shippingAddress!.city,
              postcode: data.shippingAddress!.postcode,
              county: data.shippingAddress!.county ?? "",
              country: data.shippingAddress!.country,
              region: data.shippingAddress!.region ?? "",
              instructions: "",
            }
          : primaryAddr
          ? {
              first_name: primaryAddr.first_name ?? data.firstName,
              last_name: primaryAddr.last_name ?? data.lastName,
              phone_number: primaryAddr.phone_number ?? data.phone ?? "",
              company_name: primaryAddr.company_name ?? data.company ?? "",
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
              first_name: data.firstName,
              last_name: data.lastName,
              phone_number: data.phone ?? "",
              company_name: data.company ?? "",
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
          ? { contact: { name: `${data.firstName} ${data.lastName}`, email: data.email } }
          : { customer: { name: `${data.firstName} ${data.lastName}`, email: data.email } };

        const res = await checkoutApi({
          client,
          path: { cartID: cartId },
          body: {
            data: {
              ...contactOrCustomer,
              shipping_address: shippingAddr,
              billing_address: {
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

        const orderId = res.data?.data?.id;
        if (!orderId) {
          throw new Error("Order creation failed — no order ID returned.");
        }

        await clearCart();
        router.push(`/${lang}/order-confirmation/${orderId}`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to place order. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [cartId, clearCart, router, lang, savedAddresses, credentials]
  );

  return { submitCheckout, isLoading, error };
}
