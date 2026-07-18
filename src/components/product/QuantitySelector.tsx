"use client";

import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  /** "sm" squeezes the stepper (28px controls) for tight spots like the
   * product card's price row; "default" is the regular 36px control. */
  size?: "default" | "sm";
};

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 9999999,
  disabled = false,
  className,
  size = "default",
}: Props) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= min && n <= max) {
      onChange(n);
    } else {
      setDraft(String(value));
    }
  };

  const small = size === "sm";
  const buttonClasses = cn(
    "flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors",
    small ? "w-7 h-7" : "w-9 h-9",
  );

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-gray-200 overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className={buttonClasses}
      >
        <Minus size={small ? 12 : 14} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        }}
        aria-label="Quantity"
        className={cn(
          "text-center font-medium text-gray-900 bg-transparent border-x border-gray-200 focus:outline-none disabled:opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          small ? "w-9 h-7 text-xs" : "w-12 h-9 text-sm",
        )}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className={buttonClasses}
      >
        <Plus size={small ? 12 : 14} />
      </button>
    </div>
  );
}
