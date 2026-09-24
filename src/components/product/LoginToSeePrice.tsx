"use client";

import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * "Login to see price" button shown in place of Add to Cart when a product has
 * no price for the current shopper and the loginToSeePrice config is on (signed
 * out). Clicking it opens the shared login overlay. Styled like AddToCart.
 */
export function LoginToSeePrice({
  onClick,
  variant = "default",
  className,
}: {
  onClick: () => void;
  variant?: "default" | "full";
  className?: string;
}) {
  const t = useTranslations("product");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all bg-brand-primary text-button-text hover:opacity-90",
        variant === "full"
          ? "w-full py-3 px-6 text-base"
          : "px-3 py-1.5 text-xs",
        className,
      )}
    >
      <LogIn size={variant === "full" ? 18 : 14} />
      {t("loginToSeePrice")}
    </button>
  );
}
