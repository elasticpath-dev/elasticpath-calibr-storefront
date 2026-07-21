"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  usePreferences,
  type CartMode,
  type ShoppingMode,
} from "@/context/PreferencesContext";
import { RadioOption, type OptionItem } from "./RadioOption";
import { LocaleSelector } from "./LocaleSelector";
import { CurrencySelector } from "./CurrencySelector";
import { LocationSelector } from "./LocationSelector";

export function SettingsButton() {
  const t = useTranslations("preferences");
  const { cartMode, shoppingMode, shoppingModeLocked, setCartMode, setShoppingMode } =
    usePreferences();
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "en";

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartModeOptions: OptionItem[] = [
    { value: "drawer", label: t("cartModeDrawer"), desc: t("cartModeDrawerDesc") },
    { value: "full", label: t("cartModeFull"), desc: t("cartModeFullDesc", { path: `/${lang}/cart` }) },
  ];

  const shoppingModeOptions: OptionItem[] = [
    { value: "b2c", label: t("shoppingModeB2C"), desc: t("shoppingModeB2CDesc") },
    { value: "b2b", label: t("shoppingModeB2B"), desc: t("shoppingModeB2BDesc") },
  ];

  const drawer = isOpen && (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998] animate-fade-in"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="fixed top-0 right-0 h-screen w-[320px] bg-white shadow-2xl z-[9999] flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings size={17} className="text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">{t("title")}</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label={t("closePreferences")}
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Settings */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Cart Mode */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t("cartMode")}
            </p>
            <div className="space-y-2">
              {cartModeOptions.map((opt) => (
                <RadioOption
                  key={opt.value}
                  option={opt}
                  selected={cartMode === opt.value}
                  onSelect={() => setCartMode(opt.value as CartMode)}
                />
              ))}
            </div>
          </section>

          {/* Shopping Mode — hidden on Elastic Path–hosted (B2C-only) stores */}
          {!shoppingModeLocked && (
            <section>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                {t("shoppingMode")}
              </p>
              <div className="space-y-2">
                {shoppingModeOptions.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    option={opt}
                    selected={shoppingMode === opt.value}
                    onSelect={() => setShoppingMode(opt.value as ShoppingMode)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Location — only when multi-location inventory is enabled and
              locations exist (component gates itself). */}
          <LocationSelector />

          {/* Language */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t("language")}
            </p>
            <LocaleSelector currentLocale={lang} />
          </section>

          {/* Currency */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t("currency")}
            </p>
            <CurrencySelector />
          </section>
        </div>

        {/* Footer hint */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <p className="text-xs text-gray-400 text-center">
            {t("footerHint")}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={t("openPreferences")}
        className="relative flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <Settings size={18} />
      </button>

      {mounted && createPortal(drawer, document.body)}
    </>
  );
}
