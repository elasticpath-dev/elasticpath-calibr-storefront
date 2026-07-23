"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { configureByContextProduct } from "@epcc-sdk/sdks-shopper";
import type { Client } from "@hey-api/client-fetch";
import { createEpClient } from "@/lib/api/ep-client";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { ProductThumbnail } from "./ProductThumbnail";
import { QuantitySelector } from "./QuantitySelector";
import type {
  BundleComponent,
  BundleComponentOption,
} from "@/lib/api/products";

type OptionSelection = { productId: string; quantity: number };
type SelectionState = Record<string, OptionSelection[]>;
type OptionPrice = { price: string; originalPrice?: string; saleId?: string };

type Props = {
  productId: string;
  components: BundleComponent[];
  initialPrice?: string;
  initialOriginalPrice?: string;
  className?: string;
  stickyFooter?: boolean;
};

function buildInitialSelections(components: BundleComponent[]): SelectionState {
  const state: SelectionState = {};
  for (const component of components) {
    if (component.min === 0) {
      state[component.key] = [];
    } else {
      const defaults = component.options.filter((o) => o.isDefault);
      const rest = component.options.filter((o) => !o.isDefault);
      const pool = [...defaults, ...rest];
      state[component.key] = pool.slice(0, component.min).map((o) => ({
        productId: o.id,
        quantity: o.quantity,
      }));
    }
  }
  return state;
}

export function BundleConfigurator({
  productId,
  components,
  initialPrice,
  initialOriginalPrice,
  className,
  stickyFooter = false,
}: Props) {
  const t = useTranslations("bundle");
  const { showBundleOptionImages } = useTenantConfig();

  const epClientRef = useRef<Client | null>(null);
  if (!epClientRef.current) {
    epClientRef.current = createEpClient();
  }

  const sorted = [...components].sort((a, b) => a.sortOrder - b.sortOrder);

  const [selections, setSelections] = useState<SelectionState>(() =>
    buildInitialSelections(sorted),
  );
  const [quantity, setQuantity] = useState(1);

  const [optionPrices, setOptionPrices] = useState<Record<string, OptionPrice>>(
    () => {
      const prices: Record<string, OptionPrice> = {};
      for (const component of components) {
        for (const option of component.options) {
          if (option.priceFormatted) {
            // saleId intentionally omitted — configure endpoint is the authoritative source
            // to prevent the badge flashing on then off when configure overwrites static data
            prices[option.id] = {
              price: option.priceFormatted,
              originalPrice: option.originalPriceFormatted,
            };
          }
        }
      }
      return prices;
    },
  );

  const [configuredPrice, setConfiguredPrice] = useState<string | null>(
    initialPrice ?? null,
  );
  const [originalConfiguredPrice, setOriginalConfiguredPrice] = useState<
    string | null
  >(initialOriginalPrice ?? null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { addBundleItem, isLoading } = useCart();
  const { credentials } = useAuth();

  // Reset state when account changes (login / logout / account switch).
  // Using a ref so the effect only fires on actual changes, not on every render.
  const accountRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const current = credentials?.selected ?? null;
    if (accountRef.current === undefined) {
      accountRef.current = current;
      return;
    }
    if (current === accountRef.current) return;
    accountRef.current = current;

    const sortedComponents = [...components].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    setSelections(buildInitialSelections(sortedComponents));
    const prices: Record<string, OptionPrice> = {};
    for (const c of components) {
      for (const o of c.options) {
        if (o.priceFormatted) {
          prices[o.id] = {
            price: o.priceFormatted,
            originalPrice: o.originalPriceFormatted,
          };
        }
      }
    }
    setOptionPrices(prices);
    setConfiguredPrice(initialPrice ?? null);
    setOriginalConfiguredPrice(initialOriginalPrice ?? null);
    setQuantity(1);
    epClientRef.current = createEpClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials?.selected]);

  const buildCartOptions = useCallback(
    (state: SelectionState): Record<string, Record<string, number>> => {
      const result: Record<string, Record<string, number>> = {};
      for (const [key, sels] of Object.entries(state)) {
        if (sels.length > 0) {
          result[key] = {};
          for (const sel of sels) {
            result[key][sel.productId] = sel.quantity;
          }
        }
      }
      return result;
    },
    [],
  );

  const configurePrices = useCallback(
    async (state: SelectionState) => {
      const client = epClientRef.current;
      if (!client) return;
      const cartOptions = buildCartOptions(state);
      if (Object.keys(cartOptions).length === 0) return;
      setIsConfiguring(true);
      try {
        const res = await configureByContextProduct({
          client,
          path: { product_id: productId },
          body: { data: { selected_options: cartOptions as any } },
        });
        const product = res.data?.data;
        if (!product) return;

        setConfiguredPrice(
          product.meta?.display_price?.without_tax?.formatted ??
            product.meta?.display_price?.with_tax?.formatted ??
            null,
        );
        setOriginalConfiguredPrice(
          product.meta?.original_display_price?.without_tax?.formatted ??
            product.meta?.original_display_price?.with_tax?.formatted ??
            null,
        );

        const compProducts = product.meta?.component_products as
          | Record<
              string,
              {
                sale_id?: string;
                display_price?: {
                  without_tax?: { formatted?: string };
                  with_tax?: { formatted?: string };
                };
                original_display_price?: {
                  without_tax?: { formatted?: string };
                  with_tax?: { formatted?: string };
                };
              }
            >
          | undefined;

        if (compProducts) {
          setOptionPrices((prev) => {
            const updated = { ...prev };
            for (const [id, data] of Object.entries(compProducts)) {
              const price =
                data.display_price?.without_tax?.formatted ??
                data.display_price?.with_tax?.formatted;
              const originalPrice =
                data.original_display_price?.without_tax?.formatted ??
                data.original_display_price?.with_tax?.formatted;
              if (price)
                updated[id] = { price, originalPrice, saleId: data.sale_id };
            }
            return updated;
          });
        }
      } catch {
        // Silently ignore — prices remain as seeded from PDP data
      } finally {
        setIsConfiguring(false);
      }
    },
    [productId, buildCartOptions],
  );

  useEffect(() => {
    const timer = setTimeout(() => configurePrices(selections), 150);
    return () => clearTimeout(timer);
  }, [selections, configurePrices]);

  const toggleOption = (
    component: BundleComponent,
    option: BundleComponentOption,
  ) => {
    const { key, min, max } = component;
    setSelections((prev) => {
      const current = prev[key] ?? [];
      const isSelected = current.some((s) => s.productId === option.id);

      if (isSelected) {
        if (current.length <= min) return prev;
        return {
          ...prev,
          [key]: current.filter((s) => s.productId !== option.id),
        };
      } else {
        if (max === 1) {
          return {
            ...prev,
            [key]: [{ productId: option.id, quantity: option.quantity }],
          };
        }
        if (current.length >= max) return prev;
        return {
          ...prev,
          [key]: [
            ...current,
            { productId: option.id, quantity: option.quantity },
          ],
        };
      }
    });
  };

  const changeOptionQty = (
    componentKey: string,
    optProductId: string,
    qty: number,
  ) => {
    setSelections((prev) => ({
      ...prev,
      [componentKey]: (prev[componentKey] ?? []).map((s) =>
        s.productId === optProductId ? { ...s, quantity: qty } : s,
      ),
    }));
  };

  const handleAddToCart = async () => {
    await addBundleItem(productId, buildCartOptions(selections), quantity);
  };

  const allRequired = sorted.every(
    (c) => (selections[c.key] ?? []).length >= c.min,
  );

  return (
    <div className={className}>
      {/* Configured bundle price */}
      <div className="mb-6">
        {configuredPrice ? (
          <div
            className={`flex items-baseline gap-2 transition-opacity duration-150 ${
              isConfiguring ? "opacity-50" : "opacity-100"
            }`}
          >
            <span className="text-2xl font-bold text-gray-900">
              {configuredPrice}
            </span>
            {originalConfiguredPrice && (
              <span className="text-base text-gray-400 line-through">
                {originalConfiguredPrice}
              </span>
            )}
          </div>
        ) : (
          <Skeleton width={144} height={32} />
        )}
      </div>

      {/* Component groups */}
      <div className="space-y-4 mb-6">
        {sorted.map((component) => {
          const { key, min, max } = component;
          const isMulti = max > 1;
          const currentSels = selections[key] ?? [];
          const selectedCount = currentSels.length;
          const atMax = selectedCount >= max;
          const satisfied = selectedCount >= min;
          const sortedOptions = [...component.options].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          );

          return (
            <div key={key} className="border border-gray-200 rounded-xl p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {component.name}
                </h3>
                <div className="flex items-center gap-2">
                  {isMulti && (
                    <Badge
                      variant={satisfied ? "success" : "warning"}
                      size="sm"
                    >
                      {t("selectedCount", { selected: selectedCount, max })}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">
                    {min === 0 ? t("optional") : t("required")}
                    {" · "}
                    {min === max
                      ? t("selectExact", { count: min })
                      : t("selectRange", { min, max })}
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedOptions.map((option) => {
                  const isSelected = currentSels.some(
                    (s) => s.productId === option.id,
                  );
                  const selectedEntry = currentSels.find(
                    (s) => s.productId === option.id,
                  );
                  const isDisabled = !isSelected && atMax && max > 1;
                  const canDeselect = isSelected && selectedCount > min;
                  const optPrice = optionPrices[option.id];
                  const hasVariableQty =
                    option.min !== undefined &&
                    option.max !== undefined &&
                    option.max > option.min;
                  const clickable = isSelected ? canDeselect : !isDisabled;

                  return (
                    // div instead of button — QuantitySelector has its own interactive elements inside
                    <div
                      key={option.id}
                      role="button"
                      tabIndex={clickable ? 0 : -1}
                      aria-pressed={isSelected}
                      onClick={() =>
                        clickable && toggleOption(component, option)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          clickable && toggleOption(component, option);
                        }
                      }}
                      className={`relative flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors select-none ${
                        hasVariableQty ? (isSelected ? "pb-10" : "pb-6") : ""
                      } ${optPrice?.saleId ? "pt-5" : ""} ${
                        isSelected
                          ? "border-brand-primary bg-brand-primary/5"
                          : isDisabled
                            ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                            : "border-gray-200 hover:border-gray-300 cursor-pointer"
                      }`}
                    >
                      {optPrice?.saleId && (
                        <Badge
                          variant="error"
                          size="sm"
                          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white uppercase tracking-wide whitespace-nowrap px-3"
                        >
                          {optPrice.saleId}
                        </Badge>
                      )}

                      {showBundleOptionImages && option.imageUrl && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 shrink-0">
                          <ProductThumbnail
                            imageUrl={option.imageUrl}
                            name={option.name}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {option.name}
                        </p>
                        {option.sku && (
                          <p className="text-xs text-gray-400 break-all">
                            {t("sku", { sku: option.sku })}
                          </p>
                        )}
                        {optPrice ? (
                          <div className="mt-1">
                            {optPrice.originalPrice ? (
                              <>
                                <span className="text-xs font-bold text-gray-900">
                                  {t("now")} {optPrice.price}
                                </span>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {t("was")}{" "}
                                  <span className="line-through">
                                    {optPrice.originalPrice}
                                  </span>
                                </p>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-gray-700">
                                {optPrice.price}
                              </span>
                            )}
                          </div>
                        ) : option.quantity > 1 ? (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {t("quantityDisplay", { qty: option.quantity })}
                          </p>
                        ) : null}
                      </div>

                      {/* Radio (single) or checkbox (multi) indicator */}
                      {isMulti ? (
                        <div
                          className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-brand-primary bg-brand-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              viewBox="0 0 10 8"
                              className="w-2.5 h-2 text-white fill-current"
                            >
                              <path
                                d="M1 4l2.5 2.5L9 1"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                            isSelected
                              ? "border-brand-primary bg-brand-primary"
                              : "border-gray-300"
                          }`}
                        />
                      )}

                      {/* Min/max range hint — bottom-right corner when not selected */}
                      {!isSelected && hasVariableQty && (
                        <p className="absolute bottom-1.5 right-2 text-[10px] text-gray-400">
                          {t("qtyRange", {
                            min: option.min!,
                            max: option.max!,
                          })}
                        </p>
                      )}

                      {/* Quantity selector — inside the card, bottom-right corner, scaled down */}
                      {isSelected && hasVariableQty && (
                        <div
                          className="absolute bottom-1.5 right-1.5 origin-bottom-right scale-[0.72]"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <QuantitySelector
                            value={selectedEntry?.quantity ?? option.quantity}
                            onChange={(qty) =>
                              changeOptionQty(key, option.id, qty)
                            }
                            min={option.min!}
                            max={option.max!}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Validation hint when below min */}
              {!satisfied && min > 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  {t("selectAtLeast", { min })}
                  {selectedCount > 0 &&
                    ` ${t("moreNeeded", { count: min - selectedCount })}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall bundle quantity + add to cart */}
      <div className={`flex items-center gap-4 ${stickyFooter ? "sticky bottom-0 bg-white border-t border-gray-100 pt-3 pb-1 -mx-4 px-4" : ""}`}>
        <QuantitySelector value={quantity} onChange={setQuantity} min={1} />
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          isLoading={isLoading}
          disabled={!allRequired}
          onClick={handleAddToCart}
        >
          {t("addToCart")}
        </Button>
      </div>
    </div>
  );
}
