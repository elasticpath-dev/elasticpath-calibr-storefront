"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { locales } from "@/lib/i18n/config";
import { NavBarView, type NavStyle } from "@/components/header/navigation/NavBarView";
import {
  publishPlasmicNavItems,
  publishPlasmicNavPending,
} from "@/components/header/navigation/plasmic-nav-store";
import type {
  NavColumn,
  NavItem,
  NavTreeNode,
} from "@/components/header/navigation/types";

export type StudioNavChild = {
  label?: string;
  href?: string;
  children?: Array<{ label?: string; href?: string }>;
};

export type StudioNavItem = {
  itemType?: "static" | "hierarchy" | "node";
  /** Display label — required for static items; overrides the catalog name for hierarchy/node items when set. */
  label?: string;
  /** Link target for static items (site-relative, e.g. /category/tools). */
  href?: string;
  /** Static children (2 levels max, matching the catalog nav's depth). */
  children?: StudioNavChild[];
  hierarchyId?: string;
  nodeId?: string;
};

export type StorefrontNavigationProps = {
  items?: StudioNavItem[];
  lang?: string;
  navStyle?: NavStyle;
  className?: string;
};

function staticChildToTree(child: StudioNavChild, keyPrefix: string, index: number): NavTreeNode {
  const key = `${keyPrefix}-${index}`;
  return {
    key,
    label: child.label ?? "",
    href: child.href ?? "/",
    children: child.children
      ?.filter((c) => c.label)
      .map((c, i) => ({
        key: `${key}-${i}`,
        label: c.label ?? "",
        href: c.href ?? "/",
      })),
  };
}

/** Builds a NavItem from a fully static Studio item — synthesizing megaMenu
 * columns in the same shape the catalog nav produces, so both dropdown
 * styles work. */
function staticItemToNavItem(item: StudioNavItem, index: number): NavItem {
  const key = `static-${index}`;
  const children = (item.children ?? [])
    .filter((c) => c.label)
    .map((c, i) => staticChildToTree(c, key, i));

  const columns: NavColumn[] = children.map((child) => ({
    groups: [
      {
        heading: child.label,
        headingHref: child.href,
        items:
          child.children?.map((g) => ({ key: g.key, label: g.label, href: g.href })) ?? [],
      },
    ],
  }));

  return {
    key,
    label: item.label ?? "",
    href: item.href ?? "/",
    megaMenu: columns.length > 0 ? { columns } : undefined,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * Plasmic-registered top navigation. A Studio author defines items that are
 * either fully static (label/href + nested children) or reference a catalog
 * hierarchy/node — those get their subtree fetched from
 * /api/navigation/subtree at runtime. Renders the same NavBarView as the
 * catalog-driven NavBar.
 *
 * navStyle and lang are resolved HERE rather than threaded as props:
 * componentProps on PlasmicComponent only reach the Studio-designed root
 * component, never nested code components, so props from the Header would
 * silently stay at their defaults. Style comes from tenant config
 * (client-exposed), locale from the URL's first segment.
 */
// Resolved nav items keyed by the authored items' JSON signature. The
// Header renders per page, so every client-side navigation remounts this
// component — without a module-level cache the nav would flash its skeleton
// and refetch subtrees on each category change. In-flight promises are
// cached too, so simultaneous mounts share one resolution.
const resolvedNavCache = new Map<string, NavItem[]>();
const inFlightNavResolutions = new Map<string, Promise<NavItem[]>>();

async function resolveStudioItems(itemsSignature: string): Promise<NavItem[]> {
  const cached = inFlightNavResolutions.get(itemsSignature);
  if (cached) return cached;

  const promise = (async () => {
    const parsed: StudioNavItem[] = JSON.parse(itemsSignature);
    const resolved = await Promise.all(
      parsed.map(async (item, index): Promise<NavItem | null> => {
        const itemType = item.itemType ?? "static";

        if (itemType === "static") {
          if (!item.label) return null;
          return staticItemToNavItem(item, index);
        }

        const param =
          itemType === "hierarchy"
            ? item.hierarchyId && `hierarchyId=${encodeURIComponent(item.hierarchyId)}`
            : item.nodeId && `nodeId=${encodeURIComponent(item.nodeId)}`;
        if (!param) return null;

        try {
          const res = await fetch(`/api/navigation/subtree?${param}`);
          if (!res.ok) return null;
          const json = (await res.json()) as { data?: NavItem };
          if (!json.data) return null;
          return item.label ? { ...json.data, label: item.label } : json.data;
        } catch {
          return null;
        }
      }),
    );
    const items = resolved.filter((i): i is NavItem => i !== null);
    resolvedNavCache.set(itemsSignature, items);
    return items;
  })().finally(() => {
    inFlightNavResolutions.delete(itemsSignature);
  });

  inFlightNavResolutions.set(itemsSignature, promise);
  return promise;
}

export function StorefrontNavigation({
  items = [],
  lang,
  navStyle,
  className,
}: StorefrontNavigationProps) {
  // Stable signature so resolution re-runs only when the authored items
  // actually change (Studio canvas re-renders with fresh array identities).
  const itemsSignature = JSON.stringify(items);

  // Seed from the cache so remounts render the nav immediately.
  const [navItems, setNavItems] = useState<NavItem[] | null>(
    () => resolvedNavCache.get(itemsSignature) ?? null,
  );
  const { navStyle: configNavStyle } = useTenantConfig();
  const pathname = usePathname();

  const pathLocale = pathname?.split("/")[1];
  const effectiveLang =
    lang ??
    ((locales as readonly string[]).includes(pathLocale ?? "") ? pathLocale! : "en");
  const effectiveNavStyle = navStyle ?? configNavStyle;

  useEffect(() => {
    const cached = resolvedNavCache.get(itemsSignature);
    if (cached) {
      setNavItems(cached);
      publishPlasmicNavItems(cached);
      return;
    }
    publishPlasmicNavPending();
    let cancelled = false;
    resolveStudioItems(itemsSignature).then((resolved) => {
      if (!cancelled) setNavItems(resolved);
      // Publish even if this instance unmounted — the mobile drawer (outside
      // the Plasmic tree) consumes these via plasmic-nav-store.
      publishPlasmicNavItems(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [itemsSignature]);

  // No loading skeleton — render an empty nav until the items resolve (then
  // fill in), avoiding the skeleton→content flicker.
  return (
    <div className={className}>
      <NavBarView items={navItems ?? []} lang={effectiveLang} navStyle={effectiveNavStyle} />
    </div>
  );
}
