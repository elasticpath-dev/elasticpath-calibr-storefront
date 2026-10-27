"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { PreviewCartButton } from "@/components/header/PreviewCartButton";

/**
 * Announcement bar shown above the header on every page while
 * features.previewMode is on: a "Preview Mode" label so nobody mistakes the
 * site for production, plus the Preview Cart (snapshot date) control.
 *
 * Sticky like the header, with a fixed 40px height (h-10) — the header offsets
 * itself by the same amount (top-10) so the two stack instead of overlapping
 * while scrolling.
 */
export function PreviewAnnouncementBar() {
  const { previewMode } = useTenantConfig();
  const t = useTranslations("preview");
  if (!previewMode) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 h-10 w-full bg-amber-500 text-amber-950"
    >
      <div className="container-shell flex h-10 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-amber-50 whitespace-nowrap">
            <Eye size={12} aria-hidden="true" />
            {t("badge")}
          </span>
          <span className="hidden sm:inline truncate text-sm font-medium">
            {t("barMessage")}
          </span>
        </div>
        <PreviewCartButton />
      </div>
    </div>
  );
}
