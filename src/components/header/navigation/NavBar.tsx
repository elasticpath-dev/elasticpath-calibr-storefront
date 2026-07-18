"use client";

import { useNavigation } from "@/context/NavigationContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { NavBarView, type NavStyle } from "./NavBarView";

type NavBarProps = {
  lang: string;
  navStyle?: NavStyle;
};

/**
 * Catalog-driven desktop nav: data from NavigationContext
 * (/api/navigation), presentation in NavBarView — which is shared with the
 * Plasmic StorefrontNavigation component.
 */
export function NavBar({ lang, navStyle = "mega" }: NavBarProps) {
  const { navItems, isLoading, error } = useNavigation();

  if (isLoading) {
    return (
      <nav aria-label="Main navigation" className="hidden lg:block">
        <ul className="flex items-center gap-2 px-3.5 py-2">
          {[72, 96, 84, 64, 88].map((width, i) => (
            <li key={i}>
              <Skeleton height={16} width={width} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (error) {
    return (
      <nav aria-label="Main navigation" className="hidden lg:block">
        <p className="px-3.5 py-2 text-sm text-red-600">{error}</p>
      </nav>
    );
  }

  return <NavBarView items={navItems} lang={lang} navStyle={navStyle} />;
}
