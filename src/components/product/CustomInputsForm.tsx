"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ProductCustomInput } from "@/lib/api/products";

type Props = {
  inputs: Record<string, ProductCustomInput>;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string>;
};

export function CustomInputsForm({ inputs, values, onChange, errors }: Props) {
  const t = useTranslations("product");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(inputs).map(([key, config]) => {
        const error = errors?.[key];
        return (
          <div key={key}>
            <label
              htmlFor={`custom-input-${key}`}
              className="block text-sm font-medium text-ink-700 mb-1"
            >
              {config.name}
              {!config.required && (
                <span className="ml-1 text-xs font-normal text-ink-400">
                  ({t("customInputOptional")})
                </span>
              )}
            </label>
            <input
              id={`custom-input-${key}`}
              type="text"
              value={values[key] ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              required={config.required}
              aria-invalid={!!error}
              aria-describedby={error ? `custom-input-${key}-error` : undefined}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:border-transparent",
                error
                  ? "border-red-400 focus:ring-red-400"
                  : "border-ink-200 focus:ring-brand-primary",
              )}
            />
            {error && (
              <p
                id={`custom-input-${key}-error`}
                className="mt-1 text-xs text-red-600"
              >
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
