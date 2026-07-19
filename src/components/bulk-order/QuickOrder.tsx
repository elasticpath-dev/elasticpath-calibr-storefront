"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { QuantitySelector } from "@/components/product/QuantitySelector";
import { useCart, type BulkOrderError } from "@/context/CartContext";
import { BulkOrderErrors } from "./BulkOrderErrors";

type Row = { sku: string; quantity: number };

const INITIAL_ROWS: Row[] = Array.from({ length: 6 }, () => ({
  sku: "",
  quantity: 1,
}));

/**
 * Row-based quick ordering: a grid of SKU + quantity inputs added to the cart
 * in one call. Mirrors the master storefront's Quick Order tab, adapted to
 * this project's cart, QuantitySelector, Button, toast and i18n.
 */
export function QuickOrder() {
  const t = useTranslations("bulkOrder");
  const { addItemsBySku } = useCart();
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
  const [errors, setErrors] = useState<BulkOrderError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { sku: "", quantity: 1 }]);

  const removeRow = (index: number) => {
    if (rows.length === 1) {
      toast.error(t("atLeastOneRow"));
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddToCart = async () => {
    const items = rows.filter((r) => r.sku.trim() && r.quantity > 0);
    if (items.length === 0) {
      toast.error(t("nothingToAdd"));
      return;
    }
    setErrors([]);
    setIsSubmitting(true);
    try {
      const { addedCount, errors: failed } = await addItemsBySku(
        items.map((r) => ({ sku: r.sku.trim(), quantity: r.quantity })),
      );
      setErrors(failed);
      if (addedCount > 0) toast.success(t("addedSuccess", { count: addedCount }));
      if (failed.length > 0) toast.error(t("someFailed", { count: failed.length }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorForSku = (sku: string) =>
    errors.find((e) => e.sku && e.sku === sku.trim());

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">{t("quickOrderHint")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((row, index) => {
          const rowError = row.sku ? errorForSku(row.sku) : undefined;
          return (
            <div key={index}>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder={t("skuPlaceholder")}
                  value={row.sku}
                  onChange={(e) => updateRow(index, { sku: e.target.value })}
                  className={`flex-1 h-9 rounded-lg border px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary ${
                    rowError ? "border-red-400" : "border-gray-200"
                  }`}
                />
                <QuantitySelector
                  value={row.quantity}
                  onChange={(quantity) => updateRow(index, { quantity })}
                  min={1}
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label={t("removeRow")}
                  className="flex-none p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {rowError && (
                <p className="mt-1 text-xs text-red-600">
                  {rowError.detail || rowError.title || t("unknownError")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={addRow} leftIcon={<Plus size={16} />}>
          {t("addMore")}
        </Button>
        <Button onClick={handleAddToCart} isLoading={isSubmitting}>
          {t("addToCart")}
        </Button>
      </div>
    </div>
  );
}
