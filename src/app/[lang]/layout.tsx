import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";
import { LocaleHtml } from "@/components/LocaleHtml";
import { getTenantConfig, toClientTenantConfig } from "@/lib/tenant-config";
import { TenantConfigProvider } from "@/context/TenantConfigContext";
import { fetchOidcProfiles } from "@/lib/api/oidc";
import { OidcProfilesProvider } from "@/context/OidcProfilesContext";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getTenantConfig();
  return {
    title: {
      default: site.title,
      template: `%s | ${site.title}`,
    },
  };
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!locales.includes(lang as Locale)) {
    notFound();
  }

  const tenantConfig = await getTenantConfig();
  const oidcProfiles = await fetchOidcProfiles(tenantConfig.auth.oidcProfileIds, {
    endpointUrl: tenantConfig.epcc.endpointUrl,
    clientId: tenantConfig.epcc.clientId,
  });

  return (
    <>
      <LocaleHtml locale={lang} />
      <TenantConfigProvider value={toClientTenantConfig(tenantConfig)}>
        <OidcProfilesProvider value={oidcProfiles}>
          {children}
        </OidcProfilesProvider>
      </TenantConfigProvider>
    </>
  );
}
