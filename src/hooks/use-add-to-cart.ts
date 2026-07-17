"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCart, type ProductField } from "@/context/CartContext";
import { useSubscriptionConfig } from "@/context/SubscriptionContext";

export function useAddToCart(
  productId: string,
  customInputs?: Record<string, string>,
  productFields?: ProductField[],
) {
  const t = useTranslations("product");
  const { addItem } = useCart();
  const subscriptionConfig = useSubscriptionConfig();
  const [isPending, setIsPending] = useState(false);
  const [added, setAdded] = useState(false);

  const add = useCallback(
    async (quantity = 1): Promise<boolean> => {
      setIsPending(true);
      try {
        await addItem(
          productId,
          quantity,
          customInputs,
          subscriptionConfig ?? undefined,
          productFields,
        );
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        return true;
      } catch (err: unknown) {
        const epErrors = (err as Record<string, unknown>)?.errors;
        if (Array.isArray(epErrors) && epErrors.length > 0) {
          const first = epErrors[0] as Record<string, unknown>;
          const message = (first?.detail ?? first?.title) as string | undefined;
          if (message) {
            toast.error(message);
            return false;
          }
        }
        toast.error(t("addToCartFailed"));
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [addItem, productId, customInputs, subscriptionConfig, productFields, t],
  );

  return { add, isPending, added };
}
