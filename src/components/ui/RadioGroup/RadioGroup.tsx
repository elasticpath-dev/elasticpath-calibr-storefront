"use client";

import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type RadioOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type RadioGroupProps = {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  orientation?: "vertical" | "horizontal";
  className?: string;
};

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error,
  orientation = "vertical",
  className,
}: RadioGroupProps) {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      {label && (
        <legend className="text-sm font-medium text-gray-700 mb-1">{label}</legend>
      )}
      <div
        className={cn(
          "flex gap-3",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap"
        )}
      >
        {options.map((opt) => (
          <RadioItem
            key={opt.value}
            name={name}
            option={opt}
            checked={value === opt.value}
            onChange={() => onChange?.(opt.value)}
          />
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}

type RadioItemProps = {
  name: string;
  option: RadioOption;
  checked: boolean;
  onChange: () => void;
};

function RadioItem({ name, option, checked, onChange }: RadioItemProps) {
  const itemId = `${name}-${option.value}`;

  return (
    <label
      htmlFor={itemId}
      className={cn(
        "flex items-start gap-3 cursor-pointer",
        option.disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          type="radio"
          id={itemId}
          name={name}
          value={option.value}
          checked={checked}
          disabled={option.disabled}
          onChange={onChange}
          className={cn(
            "h-4 w-4 rounded-full border appearance-none cursor-pointer",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1",
            "checked:border-brand-primary checked:border-[5px]",
            "border-gray-300 hover:border-gray-400",
            "disabled:cursor-not-allowed"
          )}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-gray-700 leading-none">
          {option.label}
        </span>
        {option.description && (
          <span className="text-xs text-gray-500">{option.description}</span>
        )}
      </div>
    </label>
  );
}
