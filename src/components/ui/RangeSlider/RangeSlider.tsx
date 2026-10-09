"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type RangeSliderValue = [number, number];

export type RangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  /** Current [low, high] selection — always kept inside [min, max]. */
  value: RangeSliderValue;
  /** Fires on every thumb move (keyboard or drag). */
  onChange: (value: RangeSliderValue) => void;
  /** Fires once the shopper releases a thumb (pointer up / key up) — use this
   * to trigger anything expensive, like a search refinement. */
  onCommit?: (value: RangeSliderValue) => void;
  disabled?: boolean;
  /** Accessible names for the two thumbs. */
  minLabel?: string;
  maxLabel?: string;
  /** Formats a value for aria-valuetext (e.g. with a currency symbol). */
  formatValue?: (value: number) => string;
  className?: string;
};

const thumb = [
  "[&::-webkit-slider-thumb]:pointer-events-auto",
  "[&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
  "[&::-webkit-slider-thumb]:rounded-full",
  // Preflight's `border-style: solid` reset doesn't reach form-control
  // pseudo-elements, so the style must be set here or no border draws.
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-brand-primary",
  "[&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:shadow-sm",
  "[&::-webkit-slider-thumb]:cursor-grab",
  "[&::-webkit-slider-thumb]:transition-transform",
  "[&::-webkit-slider-thumb]:hover:scale-110",
  "[&::-moz-range-thumb]:pointer-events-auto",
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
  "[&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-brand-primary",
  "[&::-moz-range-thumb]:bg-white",
  "[&::-moz-range-thumb]:cursor-grab",
  "focus-visible:outline-none",
  "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-brand-primary/40",
  "focus-visible:[&::-moz-range-thumb]:ring-2 focus-visible:[&::-moz-range-thumb]:ring-brand-primary/40",
  "disabled:[&::-webkit-slider-thumb]:cursor-not-allowed",
  "disabled:[&::-moz-range-thumb]:cursor-not-allowed",
].join(" ");

/**
 * Dual-thumb range slider built from two overlaid native range inputs — no
 * slider library, keyboard accessible out of the box (arrow keys, Home/End,
 * PageUp/PageDown on each thumb).
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  disabled = false,
  minLabel = "Minimum",
  maxLabel = "Maximum",
  formatValue,
  className,
}: RangeSliderProps) {
  const id = useId();
  const span = max - min;
  const [low, high] = value;
  const pct = (v: number) =>
    span > 0 ? Math.min(100, Math.max(0, ((v - min) / span) * 100)) : 0;

  const setLow = (next: number) => onChange([Math.min(next, high), high]);
  const setHigh = (next: number) => onChange([low, Math.max(next, low)]);
  const commit = () => onCommit?.(value);

  // When both thumbs sit on the max end, the low thumb must be on top or it
  // can never be grabbed again (and vice versa at the min end).
  const lowOnTop = low >= max - step;

  const shared = {
    type: "range" as const,
    min,
    max,
    step,
    disabled,
    onPointerUp: commit,
    onKeyUp: commit,
    onTouchEnd: commit,
    className: cn(
      "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent",
      thumb,
    ),
  };

  return (
    <div
      className={cn("relative h-5 w-full select-none", disabled && "opacity-50", className)}
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-200" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-primary"
        style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
      />
      <input
        {...shared}
        id={`${id}-min`}
        aria-label={minLabel}
        aria-valuetext={formatValue ? formatValue(low) : undefined}
        value={low}
        onChange={(e) => setLow(Number(e.target.value))}
        style={{ zIndex: lowOnTop ? 3 : 2 }}
      />
      <input
        {...shared}
        id={`${id}-max`}
        aria-label={maxLabel}
        aria-valuetext={formatValue ? formatValue(high) : undefined}
        value={high}
        onChange={(e) => setHigh(Number(e.target.value))}
        style={{ zIndex: lowOnTop ? 2 : 3 }}
      />
    </div>
  );
}
