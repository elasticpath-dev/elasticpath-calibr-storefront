"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { useCart, type BulkOrderError } from "@/context/CartContext";
import { BulkOrderErrors } from "./BulkOrderErrors";
import {
  parseSkuLines,
  csvToSkuLines,
  BULK_ORDER_TEMPLATE,
  downloadTextFile,
} from "./parse";

/**
 * Paste-or-upload bulk ordering: shoppers enter "SKU,quantity" lines (or
 * import a CSV/TXT), then add everything to the cart in one call. Mirrors the
 * master storefront's Bulk Order tab, adapted to this project's cart,
 * Button, toast (sonner) and i18n.
 */
export function BulkOrder() {
  const t = useTranslations("bulkOrder");
  const { addItemsBySku } = useCart();
  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<BulkOrderError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "csv" | "txt",
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    const isCsv = kind === "csv";
    const raw = await file.text();
    setValue(isCsv ? csvToSkuLines(raw) : raw.trim());
  };

  const handleAddToCart = async () => {
    const items = parseSkuLines(value);
    if (items.length === 0) {
      toast.error(t("nothingToAdd"));
      return;
    }
    setErrors([]);
    setIsSubmitting(true);
    try {
      const { addedCount, errors: failed } = await addItemsBySku(items);
      setErrors(failed);
      if (addedCount > 0) toast.success(t("addedSuccess", { count: addedCount }));
      if (failed.length > 0) toast.error(t("someFailed", { count: failed.length }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{t("addBySkuTitle")}</p>
          <p className="text-sm text-gray-500">{t("addBySkuHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-secondary hover:opacity-80"
          >
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleImport(e, "csv")}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => txtInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-secondary hover:opacity-80"
          >
            <FileText size={16} />
            {t("importText")}
          </button>
          <input
            ref={txtInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={(e) => handleImport(e, "txt")}
            className="hidden"
          />
          <button
            type="button"
            onClick={() =>
              downloadTextFile("bulk_order_template.csv", BULK_ORDER_TEMPLATE)
            }
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-secondary hover:opacity-80"
          >
            <Download size={16} />
            {t("downloadTemplate")}
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("textareaPlaceholder")}
        rows={12}
        className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
      />

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setValue("");
            setErrors([]);
          }}
        >
          {t("clearAll")}
        </Button>
        <Button onClick={handleAddToCart} isLoading={isSubmitting}>
          {t("addToCart")}
        </Button>
      </div>

      <BulkOrderErrors errors={errors} />
    </div>
  );
}
