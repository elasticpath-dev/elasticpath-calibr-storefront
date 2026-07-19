"use client";

import { useNavigation } from "@/context/NavigationContext";
import { NavBarView, type NavStyle } from "./NavBarView";

type NavBarProps = {
  lang: string;
  navStyle?: NavStyle;
};

/**
 * Catalog-driven desktop nav: data from NavigationContext
 * (/api/navigation), presentation in NavBarView — which is shared with the
 * Plasmic StorefrontNavigation component.
 *
 * No loading skeleton: NavBarView simply renders nothing until the items
 * arrive (then fills in), which avoids the skeleton→content flicker on load.
 */
export function NavBar({ lang, navStyle = "mega" }: NavBarProps) {
  const { navItems } = useNavigation();
  return <NavBarView items={navItems} lang={lang} navStyle={navStyle} />;
}
