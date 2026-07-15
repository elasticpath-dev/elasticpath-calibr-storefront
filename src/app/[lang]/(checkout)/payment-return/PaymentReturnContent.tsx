"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, XCircle } from "lucide-react";
import { confirmPayment, deleteAllCartItems, getOrderTransactions } from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { Button } from "@/components/ui/Button/Button";

const CART_STORAGE_KEY = "_store_ep_cart";

type Props = { lang: string };

export function PaymentReturnContent({ lang }: Props) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const transactionId = searchParams.get("transactionId");
    const redirectStatus = searchParams.get("redirect_status");
    const paypal = searchParams.get("paypal");
    const payerId = searchParams.get("PayerID");

    async function clearStoredCart(client: ReturnType<typeof createEpClient>) {
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
    }

    async function handlePayPalReturn(id: string) {
      if (!payerId) {
        setError(t("paymentReturnMissingOrder"));
        return;
      }

      const client = createEpClient();

      // The pending transaction was created by paymentSetup() when the
      // payment was initiated — calling paymentSetup() again here would
      // create a *second* transaction against the same order and EP
      // rejects it ("Total order amount already covered by existing
      // transactions"). Look it up from the order instead and confirm it.
      const txRes = await getOrderTransactions({
        client,
        path: { orderID: id },
      });
      if (txRes.error) {
        const detail =
          (txRes.error as any)?.errors?.[0]?.detail ??
          t("paymentConfirmFailed");
        setError(detail);
        return;
      }
      const transaction = txRes.data?.data.find(
        (tx) => tx.gateway === "paypal_express_checkout",
      );
      if (!transaction?.id) {
        setError(t("paymentConfirmFailed"));
        return;
      }

      const confirmRes = await confirmPayment({
        client,
        path: { orderID: id, transactionID: transaction.id },
        body: {
          data: {
            gateway: "paypal_express_checkout",
            method: "purchase",
            payment: payerId,
          } as any,
        },
      });
      if (confirmRes.error) {
        const detail =
          (confirmRes.error as any)?.errors?.[0]?.detail ??
          t("paymentConfirmFailed");
        setError(detail);
        return;
      }
      await clearStoredCart(client);
      router.replace(`/${lang}/order-confirmation/${id}`);
    }

    async function handleStripeReturn(id: string) {
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
            path: { orderID: id, transactionID: transactionId },
            body: { data: {} },
          });
        }
      } catch {
        // Non-fatal: EP reconciles via Stripe webhook. Proceed to confirmation.
      }

      await clearStoredCart(client);
      router.replace(`/${lang}/order-confirmation/${id}`);
    }

    async function handleReturn() {
      if (!orderId) {
        setError(t("paymentReturnMissingOrder"));
        return;
      }

      if (paypal === "cancel") {
        // Cart is left intact — the shopper can retry or pick another method.
        setCancelled(true);
        return;
      }

      if (paypal === "return") {
        await handlePayPalReturn(orderId);
        return;
      }

      await handleStripeReturn(orderId);
    }

    handleReturn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cancelled) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <XCircle size={26} className="text-gray-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">{t("paymentReturnCancelled")}</h1>
            <p className="text-sm text-gray-500">{t("paymentReturnCancelledSubtitle")}</p>
          </div>
          <Button variant="outline" size="lg" onClick={() => router.push(`/${lang}/checkout`)}>
            {t("backToCheckout")}
          </Button>
        </div>
      </main>
    );
  }

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
