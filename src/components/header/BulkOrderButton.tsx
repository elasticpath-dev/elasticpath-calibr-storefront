"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Header entry point to the Bulk / Quick Order page. Rendered between the
 * search and account controls when the tenant enables bulk ordering
 * (features.bulkOrderEnabled).
 */
export function BulkOrderButton({ lang }: { lang: string }) {
  const t = useTranslations("bulkOrder");
  return (
    <Link
      href={`/${lang}/bulk-order`}
      aria-label={t("pageTitle")}
      title={t("pageTitle")}
      className="flex items-center gap-1.5 h-9 px-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      <ClipboardList size={20} />
      <span className="hidden sm:inline text-sm font-medium whitespace-nowrap">
        {t("pageTitle")}
      </span>
    </Link>
  );
}
