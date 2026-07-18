"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEpClient } from "@/components/ClientProvider";

// Lazy like SearchModalContent — react-instantsearch + the search adapter
// only load once the shopper actually types.
const HeaderSearchResults = dynamic(() => import("./HeaderSearchResults"), {
  ssr: false,
});

type HeaderSearchBarProps = {
  lang: string;
};

/**
 * Inline header search input — shown next to the account/cart buttons when
 * the nav sits on its own row (NEXT_PUBLIC_HEADER_NAV_POSITION=below).
 * Typing shows the same live instant-search results as the search modal in
 * a dropdown; Enter goes to the full results page.
 */
export function HeaderSearchBar({ lang }: HeaderSearchBarProps) {
  const t = useTranslations("header");
  const router = useRouter();
  const epClient = useEpClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const showDropdown = open && query.trim().length > 0;

  // Close on outside click / Escape.
  useEffect(() => {
    if (!showDropdown) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showDropdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/${lang}/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={containerRef} className="relative w-72">
      <form role="search" onSubmit={handleSubmit}>
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white transition-colors"
        />
      </form>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
          <HeaderSearchResults
            lang={lang}
            epClient={epClient}
            query={query}
            onNavigate={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
