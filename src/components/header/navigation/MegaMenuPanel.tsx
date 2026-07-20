"use client";

import Link from "next/link";
import type { NavItem } from "./types";

type MegaMenuPanelProps = {
  item: NavItem;
  lang: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

/**
 * The multi-column mega-menu dropdown. Positioning comes from NavBarView's
 * portal wrapper (fixed at the header's bottom edge) so it works at any
 * header height/row count and inside Plasmic-generated wrappers.
 */
export function MegaMenuPanel({
  item,
  lang,
  onMouseEnter,
  onMouseLeave,
}: MegaMenuPanelProps) {
  const { megaMenu } = item;
  if (!megaMenu) return null;

  const colCount = megaMenu.columns.length + (megaMenu.featured ? 1 : 0);

  return (
    <div
      role="menu"
      aria-label={`${item.label} menu`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="bg-white border-t border-gray-100 shadow-xl animate-fade-in"
    >
      <div className="container-shell px-8 py-8">
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

        {item.href && (
          <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end">
            <Link
              href={`/${lang}${item.href}`}
              className="text-sm font-medium text-brand-secondary hover:underline underline-offset-2"
            >
              View all {item.label} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
