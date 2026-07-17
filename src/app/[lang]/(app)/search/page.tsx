import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header/Header";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { getTenantConfig } from "@/lib/tenant-config";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [sp, t] = await Promise.all([searchParams, getTranslations("search")]);
  const query = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim();
  return { title: query ? t("metaTitleQuery", { query }) : t("metaTitle") };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { features } = await getTenantConfig();
  if (!features.searchEnabled) notFound();

  const { lang } = await params;
  const sp = await searchParams;
  const initialQuery = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim();

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main className="container-shell px-4 sm:px-6 lg:px-8 py-10">
        <Suspense>
          <SearchPageClient
          lang={lang}
          initialQuery={initialQuery}
          filterItems={features.filterItems}
          hideNavHierarchy={features.hideNavHierarchy}
        />
        </Suspense>
      </main>
    </div>
  );
}
