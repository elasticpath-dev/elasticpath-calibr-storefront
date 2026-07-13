"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function FilterSection({ title, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="flex w-full items-center justify-between py-3 text-sm font-semibold text-gray-900 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="pb-4 space-y-0.5">{children}</div>}
    </div>
  );
}
