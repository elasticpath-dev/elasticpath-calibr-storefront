import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Wrench, PackageOpen } from "lucide-react";
import { Header } from "@/components/header/Header";
import { KitProductCard } from "@/components/kit/KitProductCard";
import { KitProductRow } from "@/components/kit/KitProductRow";
import { getKit, type KitVehicle } from "@/lib/kit";

type Props = { params: Promise<{ lang: string; engineId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("kit");
  return { title: t("title"), description: t("subtitle") };
}

function vehicleHeading(v?: KitVehicle): string | null {
  if (!v) return null;
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || null;
}

export default async function KitPage({ params }: Props) {
  const { lang, engineId } = await params;
  const t = await getTranslations("kit");

  let kit = null;
  let failed = false;
  try {
    kit = await getKit(engineId);
  } catch {
    failed = true;
  }

  const sections = kit?.sections ?? [];
  const heading = vehicleHeading(kit?.vehicle) ?? t("title");
  const subtitle = kit?.vehicle?.engine ?? t("subtitle");

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main className="container-shell px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Wrench size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{heading}</h1>
            <p className="mt-0.5 text-sm text-ink-600">{subtitle}</p>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 py-20 text-center">
            <PackageOpen size={40} className="text-ink-300" />
            <p className="mt-3 text-sm text-ink-600">
              {failed ? t("error") : t("empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {sections.map((section) => {
              // A section with any EP product renders as full-width rows (inline
              // variation selector + add to cart); otherwise a simple card grid.
              const hasEpProduct = section.products.some((p) => p.productId);
              return (
                <section key={section.key}>
                  <div className="mb-4 flex items-baseline justify-between border-b border-ink-200 pb-2">
                    <h2 className="text-lg font-bold text-ink-900">
                      {section.title}
                    </h2>
                    <span className="text-xs text-ink-500">
                      {t("productCount", { count: section.products.length })}
                    </span>
                  </div>

                  {section.products.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-ink-200 bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
                      {t("noProducts")}
                    </p>
                  ) : hasEpProduct ? (
                    <div className="space-y-4">
                      {section.products.map((product, i) =>
                        product.productId ? (
                          <KitProductRow
                            key={product.id ?? `${section.key}-${i}`}
                            product={product}
                            lang={lang}
                          />
                        ) : (
                          <KitProductCard
                            key={product.id ?? `${section.key}-${i}`}
                            product={product}
                            buyLabel={t("buy")}
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {section.products.map((product, i) => (
                        <KitProductCard
                          key={product.id ?? `${section.key}-${i}`}
                          product={product}
                          buyLabel={t("buy")}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
