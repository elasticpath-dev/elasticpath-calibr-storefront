"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import type { TenantConfig } from "@/lib/tenant-config";

type Props = {
  sku: string;
  config: TenantConfig["productQuestions"];
  className?: string;
};

/** The widget's global, as exposed by product-questions.js. */
type YounifydQuestions = {
  __loaded?: boolean;
  scan?: () => void;
  unmount?: (el: Element) => void;
};

const getWidget = (): YounifydQuestions | undefined =>
  (window as unknown as { YounifydQuestions?: YounifydQuestions })
    .YounifydQuestions;

/**
 * Product questions widget (PDP only). Renders the widget's mount point
 * keyed by SKU and loads its script, with every data-* attribute coming from
 * tenant config (NEXT_PUBLIC_PRODUCT_QUESTIONS_*). Renders nothing when the
 * feature is off or the product has no SKU.
 *
 * The script only scans the DOM once, when it first executes, and next/script
 * never re-runs a src it has already loaded — so on a client-side navigation
 * to another PDP the fresh mount point would stay empty until a hard refresh.
 * `onReady` fires on every mount of the <Script> (including navigations), so
 * we ask the widget to scan again there, and unmount the instance on leave so
 * it doesn't keep stale hosts around.
 */
export function ProductQuestions({ sku, config, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const enabled = Boolean(config?.enabled && config.src && sku);

  useEffect(() => {
    if (!enabled) return;
    const host = hostRef.current;
    // Covers the case where the script is already loaded before this effect
    // runs (navigation to another PDP) — scan() skips hosts it already owns.
    getWidget()?.scan?.();
    return () => {
      if (host) getWidget()?.unmount?.(host);
    };
  }, [enabled, sku]);

  if (!enabled) return null;

  return (
    <section className={className}>
      <div key={sku} ref={hostRef} data-yd-questions="" data-product={sku} />
      <Script
        src={config.src}
        data-store-id={config.storeId || undefined}
        data-domain={config.domain || undefined}
        data-workflow-slug={config.workflowSlug || undefined}
        data-endpoint={config.endpoint || undefined}
        data-environment-id={config.environmentId || undefined}
        strategy="afterInteractive"
        onReady={() => getWidget()?.scan?.()}
      />
    </section>
  );
}
