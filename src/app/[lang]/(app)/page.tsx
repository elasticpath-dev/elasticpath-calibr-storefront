import { Header } from "@/components/header/Header";
import { ProductCarouselDisplay } from "@/components/product/ProductCarouselDisplay";
import { getFeaturedProducts } from "@/lib/api/products";
import { getPlasmicConfig } from "@/lib/plasmic-config";
import { getPlasmicComponentData } from "@/components/plasmic/plasmic-data";
import PlasmicContent from "@/components/plasmic/PlasmicContent";
import { shouldHoldEpApis } from "@/lib/marketing-mode";
import Link from "next/link";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;

  const plasmicConfig = await getPlasmicConfig();
  // Marketing mode (signed out): skip featured products so no Elastic Path
  // call (or access token) happens — the Plasmic homepage renders instead.
  const hold = await shouldHoldEpApis();
  const [products, plasmicData] = await Promise.all([
    hold ? Promise.resolve([]) : getFeaturedProducts(25),
    plasmicConfig.enabled ? getPlasmicComponentData("homepage") : null,
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main>
        {plasmicConfig.enabled ? (
          <PlasmicContent component="homepage" prefetchedData={plasmicData} />
        ) : (
          <>
            <HeroSection lang={lang} />
            <FeaturedSection lang={lang} products={products} />
          </>
        )}
      </main>
    </div>
  );
}

function HeroSection({ lang }: { lang: string }) {
  return (
    <section className="relative bg-gray-50 overflow-hidden">
      <div className="container-shell px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-brand-secondary uppercase bg-brand-accent/20 rounded-full mb-6">
            New Collection 2026
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
            Discover
            <br />
            <span className="text-brand-secondary">Your Style</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
            Shop the latest collections from top brands. Curated for B2B and B2C
            customers with seamless purchasing experiences.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/category`}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Shop Now
            </Link>
            <Link
              href={`/${lang}/category`}
              className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              View Collections
            </Link>
          </div>
        </div>
      </div>

      <div
        className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand-accent/10 to-transparent pointer-events-none hidden lg:block"
        aria-hidden="true"
      />
    </section>
  );
}

async function FeaturedSection({
  lang,
  products,
}: {
  lang: string;
  products: Awaited<ReturnType<typeof getFeaturedProducts>>;
}) {
  return (
    <section className="container-shell px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Featured Products
        </h2>
        <Link
          href={`/${lang}/category`}
          className="text-sm font-medium text-brand-secondary hover:underline"
        >
          View all →
        </Link>
      </div>

      {products.length > 0 ? (
        <ProductCarouselDisplay products={products} lang={lang} />
      ) : (
        <p className="text-gray-400 text-sm text-center py-12">
          No products available. Make sure your Elastic Path catalog is
          configured and published.
        </p>
      )}
    </section>
  );
}
