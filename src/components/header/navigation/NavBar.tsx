"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import type { NavItem } from "./types";
import { NAV_ITEMS } from "./nav-items";
import { useNavigation } from "@/context/NavigationContext";

type NavBarProps = {
  lang: string;
};

export function NavBar({ lang }: NavBarProps) {
  const { navItems: dynamicNavItems } = useNavigation();
  const navItems: NavItem[] =
    dynamicNavItems.length > 0 ? dynamicNavItems : NAV_ITEMS;
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = (href: string) =>
    pathname === `/${lang}${href}` || pathname.startsWith(`/${lang}${href}/`);

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

  return (
    <nav aria-label="Main navigation" className="hidden lg:block">
      <ul className="flex items-center gap-0.5">
        {navItems.map((item) => (
          <NavTopItem
            key={item.key}
            item={item}
            lang={lang}
            isActive={isActive(item.href)}
            isOpen={openKey === item.key}
            onOpen={() => open(item.key)}
            onScheduleClose={scheduleClose}
            onCancelClose={cancelClose}
          />
        ))}
      </ul>
    </nav>
  );
}

type NavTopItemProps = {
  item: NavItem;
  lang: string;
  isActive: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
};

function NavTopItem({
  item,
  lang,
  isActive,
  isOpen,
  onOpen,
  onScheduleClose,
  onCancelClose,
}: NavTopItemProps) {
  const hasMega = !!item.megaMenu;

  return (
    <li
      className="relative"
      onMouseEnter={() => hasMega && onOpen()}
      onMouseLeave={() => hasMega && onScheduleClose()}
    >
      {hasMega ? (
        <button
          className={`flex items-center gap-1 px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-150 whitespace-nowrap
            ${isActive || isOpen
              ? "text-gray-900"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => (isOpen ? onScheduleClose() : onOpen())}
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
          className={`block px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-150 whitespace-nowrap
            ${isActive
              ? "text-gray-900"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
        >
          {item.label}
        </Link>
      )}

      {(isActive || isOpen) && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-brand-primary rounded-full"
        />
      )}

      {hasMega && isOpen && (
        <MegaMenu
          item={item}
          lang={lang}
          onMouseEnter={onCancelClose}
          onMouseLeave={onScheduleClose}
        />
      )}
    </li>
  );
}

type MegaMenuProps = {
  item: NavItem;
  lang: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

function MegaMenu({ item, lang, onMouseEnter, onMouseLeave }: MegaMenuProps) {
  const { megaMenu } = item;
  if (!megaMenu) return null;

  const colCount = megaMenu.columns.length + (megaMenu.featured ? 1 : 0);

  return (
    <div
      role="menu"
      aria-label={`${item.label} menu`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed left-0 right-0 top-16 z-40 bg-white border-t border-gray-100 shadow-xl animate-fade-in"
    >
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {megaMenu.columns.map((col, ci) => (
            <div key={ci} className="space-y-6">
              {col.groups.map((group, gi) => (
                <div key={gi}>
                  {group.heading && (
                    group.headingHref ? (
                      <Link
                        href={`/${lang}${group.headingHref}`}
                        role="menuitem"
                        className="block text-xs font-semibold text-gray-700 uppercase tracking-widest mb-3 hover:text-gray-900 transition-colors"
                      >
                        {group.heading}
                      </Link>
                    ) : (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                        {group.heading}
                      </p>
                    )
                  )}
                  <ul className="space-y-2">
                    {group.items.map((leaf, li) => {
                      const isViewAll = leaf.key.startsWith("view-all-");
                      return (
                        <li key={leaf.key}>
                          {isViewAll && li > 0 && (
                            <div className="border-t border-gray-100 mt-2 pt-2" />
                          )}
                          <Link
                            href={`/${lang}${leaf.href}`}
                            role="menuitem"
                            className={
                              isViewAll
                                ? "text-xs font-medium text-brand-secondary hover:underline underline-offset-2 transition-colors"
                                : "text-sm text-gray-700 hover:text-gray-900 hover:underline underline-offset-2 transition-colors"
                            }
                          >
                            {leaf.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ))}

          {megaMenu.featured && (
            <Link
              href={`/${lang}${megaMenu.featured.href}`}
              role="menuitem"
              className={`flex flex-col justify-end p-6 rounded-xl bg-gradient-to-br
                ${megaMenu.featured.imageBg ?? "from-gray-100 to-gray-50"}
                hover:opacity-90 transition-opacity group min-h-[160px]`}
            >
              <p className="text-base font-bold text-gray-900 group-hover:underline underline-offset-2">
                {megaMenu.featured.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {megaMenu.featured.description}
              </p>
              <span className="mt-3 text-xs font-semibold text-brand-secondary">
                Shop now →
              </span>
            </Link>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end">
          <Link
            href={`/${lang}${item.href}`}
            className="text-sm font-medium text-brand-secondary hover:underline underline-offset-2"
          >
            View all {item.label} →
          </Link>
        </div>
      </div>
    </div>
  );
}
