"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { RadioOption } from "./RadioOption";

type LocaleSelectorProps = {
  currentLocale: string;
};

export function LocaleSelector({ currentLocale }: LocaleSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();

  const selectLocale = (locale: Locale) => {
    if (locale === currentLocale) return;
    const segments = pathname.split("/");
    segments[1] = locale;
    router.push(segments.join("/"));
  };

  return (
    <div className="space-y-2">
      {locales.map((locale) => (
        <RadioOption
          key={locale}
          option={{ value: locale, label: localeNames[locale] }}
          selected={locale === currentLocale}
          onSelect={() => selectLocale(locale)}
        />
      ))}
    </div>
  );
}
