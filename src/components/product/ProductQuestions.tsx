import Script from "next/script";
import type { TenantConfig } from "@/lib/tenant-config";

type Props = {
  sku: string;
  config: TenantConfig["productQuestions"];
  className?: string;
};

/**
 * Product questions widget (PDP only). Renders the widget's mount point
 * keyed by SKU and loads its script, with every data-* attribute coming from
 * tenant config (NEXT_PUBLIC_PRODUCT_QUESTIONS_*). Renders nothing when the
 * feature is off or the product has no SKU.
 */
export function ProductQuestions({ sku, config, className }: Props) {
  if (!config?.enabled || !config.src || !sku) return null;
  return (
    <section className={className}>
      <div data-yd-questions="" data-product={sku} />
      <Script
        src={config.src}
        data-store-id={config.storeId || undefined}
        data-domain={config.domain || undefined}
        data-workflow-slug={config.workflowSlug || undefined}
        data-endpoint={config.endpoint || undefined}
        data-environment-id={config.environmentId || undefined}
        strategy="afterInteractive"
      />
    </section>
  );
}
