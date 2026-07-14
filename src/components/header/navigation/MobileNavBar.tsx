"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X, ChevronDown, ChevronLeft, Globe } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import type { NavItem } from "./types";
import { NAV_ITEMS } from "./nav-items";
import { useNavigation } from "@/context/NavigationContext";
import { Skeleton } from "@/components/ui/Skeleton";

type MobileNavBarProps = {
  lang: string;
};

type DrillState =
  | { level: "top" }
  | { level: "mega"; item: NavItem };

export function MobileNavBar({ lang }: MobileNavBarProps) {
  const { navItems: dynamicNavItems, isLoading } = useNavigation();
  const navItems: NavItem[] =
    dynamicNavItems.length > 0 ? dynamicNavItems : NAV_ITEMS;
  const [isOpen, setIsOpen] = useState(false);
  const [drill, setDrill] = useState<DrillState>({ level: "top" });
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = () => {
    setIsOpen(false);
    setDrill({ level: "top" });
  };

  const handleLocaleChange = (newLocale: Locale) => {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
    close();
  };

  // Portaled to document.body: <header> uses backdrop-blur, which makes it
  // a containing block for position:fixed descendants — without the portal
  // this drawer's `fixed`/`h-full` sizing resolves against the header's own
  // (short) box instead of the viewport. Same pattern as SettingsButton /
  // CartButton.
  const drawer = isOpen && (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-left overflow-hidden"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          {drill.level === "mega" ? (
            <button
              onClick={() => setDrill({ level: "top" })}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <span className="text-base font-semibold text-gray-900">Menu</span>
          )}
          <button
            onClick={close}
            aria-label="Close menu"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Panel: top-level */}
        {drill.level === "top" && (
          <TopPanel
            lang={lang}
            pathname={pathname}
            navItems={navItems}
            isLoading={isLoading}
            onDrill={(item) => setDrill({ level: "mega", item })}
            onClose={close}
          />
        )}

        {/* Panel: mega-menu drill-down */}
        {drill.level === "mega" && (
          <MegaPanel
            lang={lang}
            item={drill.item}
            pathname={pathname}
            onClose={close}
          />
        )}

        {/* Locale switcher footer */}
        <div className="border-t border-gray-100 px-5 py-4 shrink-0">
          <p className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            <Globe size={13} /> Language
          </p>
          <div className="flex flex-wrap gap-2">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLocaleChange(locale)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors
                  ${locale === lang
                    ? "bg-brand-primary text-white border-transparent"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
              >
                {localeNames[locale]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className="flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <Menu size={22} />
      </button>

      {mounted && createPortal(drawer, document.body)}
    </div>
  );
}

function TopPanel({
  lang,
  pathname,
  navItems,
  isLoading,
  onDrill,
  onClose,
}: {
  lang: string;
  pathname: string;
  navItems: NavItem[];
  isLoading: boolean;
  onDrill: (item: NavItem) => void;
  onClose: () => void;
}) {
  const isActive = (href: string) =>
    pathname === `/${lang}${href}` || pathname.startsWith(`/${lang}${href}/`);

  if (isLoading) {
    return (
      <nav className="flex-1 overflow-y-auto py-2">
        <ul>
          {[1, 2, 3].map((i) => (
            <li key={i} className="px-5 py-3.5">
              <Skeleton height={16} width={120} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      <ul>
        {navItems.map((item) => (
          <li key={item.key}>
            {item.megaMenu ? (
              <button
                onClick={() => onDrill(item)}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors
                  ${isActive(item.href)
                    ? "text-gray-900 bg-gray-50"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                {item.label}
                <ChevronDown size={15} className="-rotate-90 text-gray-400" />
              </button>
            ) : (
              <Link
                href={`/${lang}${item.href}`}
                onClick={onClose}
                className={`block px-5 py-3.5 text-sm font-medium transition-colors
                  ${isActive(item.href)
                    ? "text-gray-900 bg-gray-50"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MegaPanel({
  lang,
  item,
  pathname,
  onClose,
}: {
  lang: string;
  item: NavItem;
  pathname: string;
  onClose: () => void;
}) {
  const { megaMenu } = item;
  if (!megaMenu) return null;

  const isActive = (href: string) =>
    pathname === `/${lang}${href}` || pathname.startsWith(`/${lang}${href}/`);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* View all link */}
      <Link
        href={`/${lang}${item.href}`}
        onClick={onClose}
        className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 text-sm font-semibold text-brand-secondary hover:bg-gray-50"
      >
        View all {item.label}
      </Link>

      {/* Columns rendered as sections */}
      {megaMenu.columns.map((col, ci) => (
        <div key={ci}>
          {col.groups.map((group, gi) => (
            <div key={gi} className="border-b border-gray-50">
              {group.heading && (
                <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  {group.heading}
                </p>
              )}
              <ul>
                {group.items.map((leaf) => (
                  <li key={leaf.key}>
                    <Link
                      href={`/${lang}${leaf.href}`}
                      onClick={onClose}
                      className={`block px-5 py-2.5 text-sm transition-colors
                        ${isActive(leaf.href)
                          ? "text-gray-900 font-medium"
                          : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                    >
                      {leaf.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}

      {/* Featured card */}
      {megaMenu.featured && (
        <Link
          href={`/${lang}${megaMenu.featured.href}`}
          onClick={onClose}
          className={`mx-4 my-4 flex flex-col p-5 rounded-xl bg-gradient-to-br
            ${megaMenu.featured.imageBg ?? "from-gray-100 to-gray-50"}`}
        >
          <p className="text-sm font-bold text-gray-900">{megaMenu.featured.title}</p>
          <p className="text-xs text-gray-600 mt-1">{megaMenu.featured.description}</p>
          <span className="mt-2 text-xs font-semibold text-brand-secondary">Shop now →</span>
        </Link>
      )}
    </div>
  );
}
