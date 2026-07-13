"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEpClient } from "@/components/ClientProvider";

// react-instantsearch + the search adapter are only fetched/parsed once a
// shopper actually opens this modal — see SearchModalContent.tsx.
const SearchModalContent = dynamic(() => import("./SearchModalContent"), {
  ssr: false,
});

export type SearchButtonProps = {
  lang: string;
};

export function SearchButton({ lang }: SearchButtonProps) {
  const t = useTranslations("header");
  const [isOpen, setIsOpen] = useState(false);
  const epClient = useEpClient();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={t("search")}
        className="flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <Search size={20} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("search")}
            className="fixed top-0 inset-x-0 z-50 p-4 sm:p-6 animate-fade-in"
          >
            <SearchModalContent
              lang={lang}
              epClient={epClient}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
