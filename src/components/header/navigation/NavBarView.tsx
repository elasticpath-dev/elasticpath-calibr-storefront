"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import type { NavItem } from "./types";
import { MegaMenuPanel } from "./MegaMenuPanel";
import { CascadeMenu } from "./CascadeMenu";

export type NavStyle = "mega" | "cascade";

type NavBarViewProps = {
  items: NavItem[];
  lang: string;
  navStyle?: NavStyle;
};

/**
 * Presentational desktop nav — used by NavBar (catalog-driven via
 * NavigationContext) and by the Plasmic StorefrontNavigation component
 * (Studio-driven items). The open dropdown panel is PORTALED to
 * document.body and fixed at the header's bottom edge: inside Plasmic
 * content the nav is wrapped in position:relative divs the Studio
 * generates, which would otherwise become the panel's containing block and
 * squeeze it to the wrapper's width (and the sticky header's
 * backdrop-filter makes it a containing block for fixed descendants — the
 * same reason MobileNavBar portals its drawer). The portal escapes both.
 */
export function NavBarView({ items, lang, navStyle = "mega" }: NavBarViewProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [panelTop, setPanelTop] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const open = useCallback((key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenKey(null), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const closeNow = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(null);
  }, []);

  // Document-level so Escape closes the panel regardless of where focus
  // sits (e.g. after a pointer click that didn't move focus into the nav).
  useEffect(() => {
    if (!openKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        triggerRefs.current.get(openKey)?.focus();
        closeNow();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openKey, closeNow]);

  // The panel pins to the bottom edge of the sticky header (which always
  // sits at the viewport top), so the dropdown looks attached to the header
  // in both nav positions and in both nav sources.
  useEffect(() => {
    if (!openKey) {
      setPanelTop(null);
      return;
    }
    const header = navRef.current?.closest("header");
    const anchor = header ?? navRef.current;
    setPanelTop(anchor ? anchor.getBoundingClientRect().bottom : 0);
  }, [openKey]);

  const openItem = openKey ? items.find((i) => i.key === openKey) : undefined;
  const openItemHasPanel =
    !!openItem && (!!openItem.megaMenu || !!openItem.children?.length);

  return (
    <nav ref={navRef} aria-label="Main navigation" className="hidden lg:block">
      <ul className="flex items-center gap-0.5">
        {items.map((item) => (
          <NavTopItem
            key={item.key}
            item={item}
            lang={lang}
            isOpen={openKey === item.key}
            onOpen={() => open(item.key)}
            onScheduleClose={scheduleClose}
            onCancelClose={cancelClose}
            registerTrigger={(el) => {
              if (el) triggerRefs.current.set(item.key, el);
              else triggerRefs.current.delete(item.key);
            }}
          />
        ))}
      </ul>

      {openItem && openItemHasPanel && panelTop !== null &&
        createPortal(
          <div className="fixed inset-x-0 z-40" style={{ top: panelTop }}>
            {navStyle === "cascade" && openItem.children?.length ? (
              <CascadeMenu
                item={openItem}
                lang={lang}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                onNavigate={closeNow}
              />
            ) : (
              <MegaMenuPanel
                item={openItem}
                lang={lang}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              />
            )}
          </div>,
          document.body,
        )}
    </nav>
  );
}

type NavTopItemProps = {
  item: NavItem;
  lang: string;
  isOpen: boolean;
  onOpen: () => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
  registerTrigger: (el: HTMLButtonElement | null) => void;
};

function NavTopItem({
  item,
  lang,
  isOpen,
  onOpen,
  onScheduleClose,
  onCancelClose,
  registerTrigger,
}: NavTopItemProps) {
  const hasPanel = !!item.megaMenu || !!item.children?.length;

  return (
    <li
      className="relative"
      onMouseEnter={() => hasPanel && onOpen()}
      onMouseLeave={() => hasPanel && onScheduleClose()}
    >
      {hasPanel ? (
        <button
          ref={registerTrigger}
          className={`flex items-center gap-1 px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-150 whitespace-nowrap
            ${isOpen
              ? "text-gray-900"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => (isOpen ? onScheduleClose() : onOpen())}
          onFocus={onCancelClose}
        >
          {item.label}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      ) : (
        <Link
          href={`/${lang}${item.href}`}
          className="block px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-150 whitespace-nowrap text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          {item.label}
        </Link>
      )}

      {isOpen && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-brand-primary rounded-full"
        />
      )}
    </li>
  );
}
