"use client";

import { Check } from "lucide-react";

export type OptionItem = { value: string; label: string; desc?: string };

export function RadioOption({
  option,
  selected,
  onSelect,
}: {
  option: OptionItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
        selected
          ? "border-brand-primary bg-brand-primary/5"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
      ].join(" ")}
    >
      <span
        className={[
          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-none transition-colors",
          selected ? "border-brand-primary bg-brand-primary" : "border-gray-300",
        ].join(" ")}
      >
        {selected && <Check size={10} className="text-white" strokeWidth={3} />}
      </span>
      <div>
        <p className="text-sm font-medium text-gray-900">{option.label}</p>
        {option.desc && (
          <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
        )}
      </div>
    </button>
  );
}
