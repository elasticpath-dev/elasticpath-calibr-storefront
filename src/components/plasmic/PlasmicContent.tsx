"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useLocale } from "next-intl";
import {
  ComponentRenderData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { getClientPlasmicLoader } from "./plasmic-loader";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { useCatalog } from "@/context/CatalogContext";
import { useAuth } from "@/context/AuthContext";

type PlasmicContentProps = {
  component: string;
  componentProps?: Record<string, unknown>;
  prefetchedData?: ComponentRenderData | null;
};

export default function PlasmicContent({
  component,
  componentProps,
  prefetchedData,
}: PlasmicContentProps) {
  const { cms, epContextTag } = useTenantConfig();
  const { catalogId, isLoading: catalogLoading } = useCatalog();
  const { selectedAccount, isAuthenticated } = useAuth();
  const language = useLocale();
  const loader = getClientPlasmicLoader(cms);
  const [variation, setVariation] = useState<Record<string, string>>({});
  const accountName = selectedAccount?.account_name ?? "";
  const isLoggedIn = isAuthenticated ? "true" : "false";

  // These are exposed as targeting traits so content editors can set up
  // Plasmic Audiences/Splits keyed on catalog (account-specific catalog
  // rules), language, signed-in account, sign-in state, or context tag for
  // personalization.
  useEffect(() => {
    if (!loader || catalogLoading) return;
    let cancelled = false;
    loader
      .getActiveVariation({
        traits: {
          catalogId: catalogId ?? "",
          language,
          accountName,
          epContextTag: epContextTag ?? "",
          isLoggedIn,
        },
      })
      .then((result) => {
        if (!cancelled) setVariation(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loader, catalogLoading, catalogId, language, accountName, epContextTag, isLoggedIn]);

  if (!loader) {
    return null;
  }

  return (
    <PlasmicRootProvider
      loader={loader}
      prefetchedData={prefetchedData ?? undefined}
      variation={variation}
      // Studio-authored link elements render through next/link — without
      // this they emit plain <a> tags and every click does a full page load
      // instead of client-side navigation.
      Link={NextLink}
      // This app loads its own fonts via next/font (see app/layout.tsx) —
      // without this, Plasmic additionally injects a render-blocking
      // <link> to fonts.googleapis.com for the same typeface.
      skipFonts
    >
      <PlasmicComponent component={component} componentProps={componentProps} />
    </PlasmicRootProvider>
  );
}
