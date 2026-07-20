import type { Metadata } from "next";
import { Header } from "@/components/header/Header";
import { getPlasmicConfig } from "@/lib/plasmic-config";
import { getPlasmicComponentData } from "@/components/plasmic/plasmic-data";
import PlasmicContent from "@/components/plasmic/PlasmicContent";

type PageProps = {
  params: Promise<{ lang: string; catchall?: string[] }>;
};

// Any /{lang}/* URL without a dedicated route lands here. The page name is the
// URL path (Plasmic Pages are keyed by their path, e.g. /black-friday); we also
// fall back to the bare slug in case the content was authored as a plain
// component rather than a Page.
async function resolvePlasmicPage(catchall: string[] | undefined) {
  const { enabled } = await getPlasmicConfig();
  if (!enabled || !catchall?.length) return { enabled, component: null, data: null };

  const path = `/${catchall.join("/")}`;
  const pathData = await getPlasmicComponentData(path);
  if (pathData) return { enabled, component: path, data: pathData };

  const name = catchall.join("/");
  const nameData = await getPlasmicComponentData(name);
  if (nameData) return { enabled, component: name, data: nameData };

  return { enabled, component: null, data: null };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { catchall } = await params;
  const { data } = await resolvePlasmicPage(catchall);
  const meta = data?.entryCompMetas?.[0]?.pageMetadata;
  if (!meta) return {};
  return {
    title: meta.title ?? undefined,
    description: meta.description ?? undefined,
    openGraph: meta.openGraphImageUrl
      ? { images: [{ url: meta.openGraphImageUrl }] }
      : undefined,
  };
}

export default async function CatchAllPage({ params }: PageProps) {
  // Root-level Plasmic catch-all: header/footer always render; main is blank
  // when no Plasmic page matches (never a 404).
  const { lang, catchall } = await params;
  const { component, data } = await resolvePlasmicPage(catchall);

  // Whether or not a Plasmic page exists for this URL, the storefront frames it
  // with the header/footer; main is the Plasmic content if found, otherwise
  // blank (no 404).
  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main>
        {component && data ? (
          <PlasmicContent component={component} prefetchedData={data} />
        ) : null}
      </main>
    </div>
  );
}
