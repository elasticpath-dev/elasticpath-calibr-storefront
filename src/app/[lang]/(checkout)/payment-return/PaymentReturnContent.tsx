"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { confirmPayment, deleteAllCartItems } from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { Button } from "@/components/ui/Button/Button";

const CART_STORAGE_KEY = "_store_ep_cart";

type Props = { lang: string };

export function PaymentReturnContent({ lang }: Props) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const transactionId = searchParams.get("transactionId");
    const redirectStatus = searchParams.get("redirect_status");

    async function handleReturn() {
      if (!orderId) {
        setError(t("paymentReturnMissingOrder"));
        return;
      }

      // Only block on an explicit failure signal.
      // redirect_status may be absent for some payment methods (Klarna, Clearpay)
      // even on a successful redirect — presence of payment_intent confirms Stripe sent us here.
      if (redirectStatus === "failed") {
        setError(t("paymentReturnFailed"));
        return;
      }

      const client = createEpClient();

      try {
        // Confirm the transaction with EP to sync payment status
        if (transactionId) {
          await confirmPayment({
            client,
            path: { orderID: orderId, transactionID: transactionId },
            body: { data: {} },
          });
        }
      } catch {
        // Non-fatal: EP reconciles via Stripe webhook. Proceed to confirmation.
      }

      // Bypass CartContext (not yet initialised on this fresh page load) — clear directly.
      try {
        const cartId = localStorage.getItem(CART_STORAGE_KEY);
        if (cartId) {
          await deleteAllCartItems({ client, path: { cartID: cartId } });
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      } catch {
        // Non-fatal: stale cart will be replaced on next session.
      }

      router.replace(`/${lang}/order-confirmation/${orderId}`);
    }

    handleReturn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">{t("paymentReturnFailed")}</h1>
            <p className="text-sm text-gray-500">{t("paymentReturnFailedSubtitle")}</p>
          </div>
          <Button variant="outline" size="lg" onClick={() => router.push(`/${lang}`)}>
            {t("returnToStore")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full border-4 border-brand-primary border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-gray-600">{t("confirmingPayment")}</p>
      </div>
    </main>
  );
}
