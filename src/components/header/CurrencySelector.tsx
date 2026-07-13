"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { AVAILABLE_CURRENCIES } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "./RadioOption";

function currencyDisplayName(code: string, locale: string): string | undefined {
  try {
    return new Intl.DisplayNames([locale], { type: "currency" }).of(code);
  } catch {
    return undefined;
  }
}

export function CurrencySelector() {
  const t = useTranslations("currency");
  const locale = useLocale();
  const { items, clearCart, createCart } = useCart();
  const { currency: current, changeCurrency } = useCurrency();

  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"new" | "clear" | null>(null);

  if (AVAILABLE_CURRENCIES.length <= 1) return null;

  const selectCurrency = (newCurrency: string) => {
    if (newCurrency === current) return;
    if (items.length > 0) {
      setPendingCurrency(newCurrency);
    } else {
      changeCurrency(newCurrency);
    }
  };

  const handleCreateNewCart = async () => {
    if (!pendingCurrency) return;
    setBusyAction("new");
    try {
      await createCart(t("newCartName", { currency: pendingCurrency }));
      changeCurrency(pendingCurrency);
    } catch {
      setBusyAction(null);
    }
  };

  const handleClearItems = async () => {
    if (!pendingCurrency) return;
    setBusyAction("clear");
    try {
      await clearCart();
      changeCurrency(pendingCurrency);
    } catch {
      setBusyAction(null);
    }
  };

  const closeModal = () => {
    if (busyAction) return;
    setPendingCurrency(null);
  };

  return (
    <>
      <div className="space-y-2">
        {AVAILABLE_CURRENCIES.map((currency) => (
          <RadioOption
            key={currency}
            option={{
              value: currency,
              label: currency,
              desc: currencyDisplayName(currency, locale),
            }}
            selected={currency === current}
            onSelect={() => selectCurrency(currency)}
          />
        ))}
      </div>

      {pendingCurrency !== null &&
        createPortal(
          // The settings drawer sits at z-[9999]; this wrapper lifts the
          // modal's stacking context above it.
          <div className="relative z-[10000]">
            <Modal
              isOpen
              onClose={closeModal}
              title={t("changeTitle", { currency: pendingCurrency })}
              description={t("changeDescription")}
              size="md"
              closeOnBackdrop={!busyAction}
              footer={
                <>
                  <Button
                    variant="ghost"
                    onClick={closeModal}
                    disabled={busyAction !== null}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearItems}
                    isLoading={busyAction === "clear"}
                    disabled={busyAction === "new"}
                  >
                    {t("clearItems")}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateNewCart}
                    isLoading={busyAction === "new"}
                    disabled={busyAction === "clear"}
                  >
                    {t("createNewCart")}
                  </Button>
                </>
              }
            >
              <p className="text-sm text-gray-600">
                {t("cartWarning", { count: items.length })}
              </p>
            </Modal>
          </div>,
          document.body,
        )}
    </>
  );
}
