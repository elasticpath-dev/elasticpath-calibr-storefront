"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Car, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VEHICLE_LEVELS, type VehicleLevelKey } from "@/lib/vehicle-finder";

type Option = { value: string; label: string };

export function VehicleFinder({ lang }: { lang: string }) {
  const t = useTranslations("vehicleFinder");
  const router = useRouter();

  const [optionsByLevel, setOptionsByLevel] = useState<
    Partial<Record<VehicleLevelKey, Option[]>>
  >({});
  const [selections, setSelections] = useState<
    Partial<Record<VehicleLevelKey, string>>
  >({});
  const [loadingLevel, setLoadingLevel] = useState<VehicleLevelKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLevel = useCallback(
    async (
      levelKey: VehicleLevelKey,
      currentSelections: Partial<Record<VehicleLevelKey, string>>,
    ) => {
      const level = VEHICLE_LEVELS.find((l) => l.key === levelKey);
      if (!level) return;

      const params = new URLSearchParams({ level: levelKey });
      for (const f of level.filters) {
        const value = currentSelections[f.from];
        if (!value) return; // a parent isn't chosen yet — nothing to load
        params.set(f.from, value);
      }

      setLoadingLevel(levelKey);
      setError(null);
      try {
        const res = await fetch(`/api/vehicle-finder?${params.toString()}`);
        const json = (await res.json().catch(() => ({}))) as {
          options?: Option[];
          error?: string;
        };
        if (res.ok) {
          setOptionsByLevel((prev) => ({ ...prev, [levelKey]: json.options ?? [] }));
        } else {
          setError(json?.error ?? t("loadError"));
        }
      } catch {
        setError(t("loadError"));
      } finally {
        setLoadingLevel(null);
      }
    },
    [t],
  );

  // Load the first level (lookup type) on mount.
  useEffect(() => {
    void fetchLevel(VEHICLE_LEVELS[0].key, {});
  }, [fetchLevel]);

  const handleSelect = (levelKey: VehicleLevelKey, value: string) => {
    const idx = VEHICLE_LEVELS.findIndex((l) => l.key === levelKey);

    // Set this selection and clear everything deeper (options + selections).
    const nextSelections: Partial<Record<VehicleLevelKey, string>> = {
      ...selections,
      [levelKey]: value || undefined,
    };
    for (let i = idx + 1; i < VEHICLE_LEVELS.length; i++) {
      delete nextSelections[VEHICLE_LEVELS[i].key];
    }
    setSelections(nextSelections);
    setOptionsByLevel((prev) => {
      const next = { ...prev };
      for (let i = idx + 1; i < VEHICLE_LEVELS.length; i++) {
        delete next[VEHICLE_LEVELS[i].key];
      }
      return next;
    });

    // Load the next level with the new selection applied.
    const child = VEHICLE_LEVELS[idx + 1];
    if (value && child) void fetchLevel(child.key, nextSelections);
  };

  const allSelected = VEHICLE_LEVELS.every((l) => selections[l.key]);

  const handleShopNow = () => {
    // Carries every selection as a query param. Point this at your real
    // results/search target — e.g. filter search by the selected fitment id.
    const params = new URLSearchParams();
    for (const l of VEHICLE_LEVELS) {
      const v = selections[l.key];
      if (v) params.set(l.key, v);
    }
    router.push(`/${lang}/search?${params.toString()}`);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <Car size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-ink-600">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6">
        {VEHICLE_LEVELS.map((level, idx) => {
          const parentReady =
            idx === 0 || !!selections[VEHICLE_LEVELS[idx - 1].key];
          const options = optionsByLevel[level.key] ?? [];
          const isLoading = loadingLevel === level.key;
          const disabled = !parentReady || isLoading;

          return (
            <div key={level.key}>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
                {t(level.key)}
              </label>
              <div className="relative">
                <select
                  value={selections[level.key] ?? ""}
                  disabled={disabled}
                  onChange={(e) => handleSelect(level.key, e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-ink-300 bg-white pl-3 pr-10 text-sm text-ink-900 focus:border-ink-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400"
                >
                  <option value="">{t("selectPlaceholder")}</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </span>
              </div>
            </div>
          );
        })}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!allSelected}
          onClick={handleShopNow}
        >
          {t("shopNow")}
        </Button>
      </div>
    </div>
  );
}
