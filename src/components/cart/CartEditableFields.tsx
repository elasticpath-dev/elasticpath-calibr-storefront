"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/Button";
import {
  getEditableValue,
  getEditableLabel,
  setEditableValue,
} from "@/lib/cart-editable";

type Props = {
  cartItemId: string;
  quantity: number;
  customInputs?: Record<string, unknown>;
  disabled?: boolean;
};

/**
 * Inline-editable custom-input fields on a cart line item. Which fields render
 * is driven by ui.cartEditableInputs; each shows an input box (empty when the
 * value is unset). Edits are held locally — nothing is saved until the shopper
 * clicks Update, which persists ALL of the item's edited custom inputs at once.
 */
export function CartEditableFields({
  cartItemId,
  quantity,
  customInputs,
  disabled,
}: Props) {
  const t = useTranslations("cart");
  const { cartEditableInputs } = useTenantConfig();
  const { updateItemCustomInputs } = useCart();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (cartEditableInputs.length === 0) return null;

  const isDirty = (fieldKey: string, saved: string) =>
    fieldKey in drafts && drafts[fieldKey] !== saved;

  const dirty = cartEditableInputs.some((field) =>
    isDirty(field.raw, getEditableValue(customInputs, field)),
  );

  const handleUpdate = async () => {
    // Apply every edited field onto the item's full custom_inputs, then save
    // once so no other inputs (parent_product_id, options, …) are lost.
    let merged: Record<string, unknown> = customInputs ?? {};
    for (const field of cartEditableInputs) {
      const saved = getEditableValue(customInputs, field);
      if (isDirty(field.raw, saved)) {
        merged = setEditableValue(merged, field, drafts[field.raw]);
      }
    }
    setSaving(true);
    try {
      await updateItemCustomInputs(cartItemId, merged, quantity);
      setDrafts({});
    } finally {
      setSaving(false);
    }
  };

  const controlsDisabled = disabled || saving;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {cartEditableInputs.map((field) => {
        const fieldKey = field.raw;
        const value = drafts[fieldKey] ?? getEditableValue(customInputs, field);
        return (
          <label key={fieldKey} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-500">
              {getEditableLabel(customInputs, field)}
            </span>
            <input
              type="text"
              value={value}
              disabled={controlsDisabled}
              onChange={(e) =>
                setDrafts((prev) => ({ ...prev, [fieldKey]: e.target.value }))
              }
              className="h-8 w-full max-w-[240px] rounded-lg border border-ink-200 bg-white px-2.5 text-[13px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </label>
        );
      })}

      {dirty && (
        <div className="flex items-center gap-2 pt-0.5">
          <Button size="xs" onClick={handleUpdate} isLoading={saving}>
            {t("editableUpdate")}
          </Button>
          <button
            type="button"
            onClick={() => setDrafts({})}
            disabled={controlsDisabled}
            className="text-[12px] font-medium text-ink-500 hover:text-ink-800 disabled:opacity-50"
          >
            {t("editableCancel")}
          </button>
        </div>
      )}
    </div>
  );
}
