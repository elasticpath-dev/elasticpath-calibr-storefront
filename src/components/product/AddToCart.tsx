"use client";

import { cn } from "@/lib/utils";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { ShoppingBag, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductField } from "@/context/CartContext";

type AddToCartProps = {
  productId: string;
  quantity?: number;
  className?: string;
  variant?: "default" | "full";
  customInputs?: Record<string, string>;
  productFields?: ProductField[];
  disabled?: boolean;
  onBeforeAdd?: () => boolean;
  /** Override the default "Add to cart"/"Added" labels — e.g. for non-product add flows like memberships. */
  label?: string;
  addedLabel?: string;
};

export function AddToCart({
  productId,
  quantity = 1,
  className,
  variant = "default",
  customInputs,
  productFields,
  disabled,
  onBeforeAdd,
  label,
  addedLabel,
}: AddToCartProps) {
  const t = useTranslations("product");
  const { add, isPending, added } = useAddToCart(productId, customInputs, productFields);

  function handleClick() {
    if (onBeforeAdd && !onBeforeAdd()) return;
    add(quantity);
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all",
        variant === "full"
          ? "w-full py-3 px-6 text-base"
          : "px-3 py-1.5 text-xs",
        added
          ? "bg-brand-secondary text-white"
          : "bg-brand-primary text-white hover:opacity-90 disabled:opacity-60",
        className,
      )}
    >
      {isPending ? (
        <Loader2 size={variant === "full" ? 18 : 14} className="animate-spin" />
      ) : added ? (
        <Check size={variant === "full" ? 18 : 14} />
      ) : (
        <ShoppingBag size={variant === "full" ? 18 : 14} />
      )}
      {added ? (addedLabel ?? t("added")) : (label ?? t("addToCart"))}
    </button>
  );
}
