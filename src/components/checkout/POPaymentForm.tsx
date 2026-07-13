"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input/Input";

type Props = {
  onSubmit: (poNumber: string) => Promise<void>;
  isProcessing: boolean;
  externalError?: string | null;
  formRef?: React.RefObject<HTMLFormElement | null>;
};

export function POPaymentForm({ onSubmit, isProcessing, externalError, formRef }: Props) {
  const t = useTranslations("checkout");
  const [poNumber, setPoNumber] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || externalError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!poNumber.trim()) {
      setLocalError(t("poNumberRequired"));
      return;
    }
    setLocalError(null);
    await onSubmit(poNumber);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <Input
        label={t("poNumber")}
        placeholder={t("poNumberPlaceholder")}
        value={poNumber}
        onChange={(e) => setPoNumber(e.target.value)}
      />

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
