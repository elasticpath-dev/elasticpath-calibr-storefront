"use client";

import { useTranslations } from "next-intl";

export function PlaceholderTab({ titleKey }: { titleKey: string }) {
  const t = useTranslations("account");
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-base font-semibold text-gray-600">
        {t(titleKey as Parameters<typeof t>[0])}
      </p>
      <p className="text-sm text-gray-400 mt-1">{t("comingSoonDesc")}</p>
    </div>
  );
}
