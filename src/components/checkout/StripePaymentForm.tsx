"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement, LinkAuthenticationElement } from "@stripe/react-stripe-js";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

type Props = {
  onPayment: (stripe: Stripe, elements: StripeElements) => Promise<void>;
  isProcessing: boolean;
  externalError?: string | null;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onConfirmingChange?: (isConfirming: boolean) => void;
  email?: string;
};

export function StripePaymentForm({ onPayment, isProcessing, externalError, formRef, onConfirmingChange, email }: Props) {
  const t = useTranslations("checkout");
  const stripe = useStripe();
  const elements = useElements();
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const displayError = stripeError || externalError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || isConfirming || isProcessing) return;

    setIsConfirming(true);
    onConfirmingChange?.(true);
    setStripeError(null);

    try {
      await onPayment(stripe, elements);
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : t("paymentFailed"));
    } finally {
      setIsConfirming(false);
      onConfirmingChange?.(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <LinkAuthenticationElement
        options={email ? { defaultValues: { email } } : undefined}
      />
      <PaymentElement options={{ layout: "tabs" }} />

      {displayError && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Hidden submit — triggered externally via formRef.requestSubmit() */}
      <button type="submit" className="sr-only" aria-hidden="true" tabIndex={-1} />
    </form>
  );
}
