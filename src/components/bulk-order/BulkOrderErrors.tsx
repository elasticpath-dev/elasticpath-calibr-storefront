"use client";

import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import type { BulkOrderError } from "@/context/CartContext";

/**
 * Inline panel listing per-SKU failures returned by the bulk add-to-cart
 * call (e.g. unknown SKU, out of stock). Shown beneath the order form.
 */
export function BulkOrderErrors({ errors }: { errors: BulkOrderError[] }) {
  const t = useTranslations("bulkOrder");
  if (errors.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200 text-red-700">
        <AlertCircle size={16} />
        <span className="text-sm font-semibold">{t("errorsHeading")}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-red-700/80">
            <th className="px-4 py-2 font-medium w-1/3">{t("errorSku")}</th>
            <th className="px-4 py-2 font-medium">{t("errorReason")}</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((err, i) => (
            <tr key={i} className="border-t border-red-100">
              <td className="px-4 py-2 font-mono text-red-900">{err.sku ?? "—"}</td>
              <td className="px-4 py-2 text-red-800">
                {err.detail || err.title || t("unknownError")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
