"use client";

import {
  useState,
  useRef,
  useEffect,
  useId,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
};

export type ComboboxProps = {
  label?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  noResultsText?: string;
  wrapperClassName?: string;
  disabled?: boolean;
};

export function Combobox({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  noResultsText = "No results",
  wrapperClassName,
  disabled,
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const selectedOption = options.find((o) => o.value === value) ?? null;

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  function computePosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(filtered.length * 36 + 8, 240);
    const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight + 8;
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      maxHeight: 240,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }

  function openDropdown() {
    if (disabled) return;
    computePosition();
    setQuery("");
    setActiveIndex(-1);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }

  function selectOption(option: ComboboxOption) {
    onChange(option.value);
    closeDropdown();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") openDropdown();
      return;
    }
    if (e.key === "Escape") { closeDropdown(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) selectOption(filtered[activeIndex]);
    }
  }

  /* Scroll active item into view */
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  /* Reposition on scroll / resize while open */
  useEffect(() => {
    if (!open) return;
    const update = () => computePosition();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      ) return;
      closeDropdown();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayValue = open ? query : (selectedOption?.label ?? "");

  const dropdown = (
    <div
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto"
    >
      <div ref={listRef} role="listbox" aria-labelledby={`${id}-label`}>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-400">{noResultsText}</div>
        ) : (
          filtered.map((opt, i) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onMouseDown={(e) => { e.preventDefault(); selectOption(opt); }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-sm cursor-pointer select-none",
                i === activeIndex ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50",
              )}
            >
              <span>
                <span className="font-medium">{opt.label}</span>
                <span className="ml-2 text-xs text-gray-400 font-mono">{opt.value}</span>
              </span>
              {opt.value === value && <Check size={14} className="text-brand-primary shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div ref={wrapperRef} className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={selectedOption && !open ? selectedOption.label : placeholder}
          value={displayValue}
          onFocus={openDropdown}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            if (!open) openDropdown();
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full h-10 rounded-lg border bg-white text-sm text-gray-900 px-3 pr-9",
            "placeholder:text-gray-400 transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
            open
              ? "border-brand-primary ring-2 ring-brand-primary/20"
              : "border-gray-300 focus:border-brand-primary focus:ring-brand-primary/20",
          )}
        />
        <ChevronDown
          size={16}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </div>
      {mounted && open && createPortal(dropdown, document.body)}
    </div>
  );
}
