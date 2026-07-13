import { Fragment } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/header/Header";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CategorySearchClient } from "@/components/category/CategorySearchClient";
import { getNodeBySlug, getHierarchyBySlug } from "@/lib/api/navigation";
import {
  getProductsForNode,
  getProductsForHierarchy,
  type ProductCardData,
} from "@/lib/api/products";
import { getTenantConfig } from "@/lib/tenant-config";
import type { Metadata } from "next";
import Link from "next/link";

type Props = {
  params: Promise<{ lang: string; slug: string[] }>;
};

function slugToLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function resolveCategory(slug: string[]) {
  const leafSlug = slug[slug.length - 1];
  if (slug.length === 1) {
    const hierarchy = await getHierarchyBySlug(leafSlug).catch(() => null);
    if (!hierarchy) return null;
    return { id: hierarchy.id, name: hierarchy.name, isHierarchy: true as const };
  }
  const node = await getNodeBySlug(leafSlug).catch(() => null);
  if (!node) return null;
  return { id: node.id, name: node.name, isHierarchy: false as const };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await resolveCategory(slug).catch(() => null);
  const name = category?.name ?? slugToLabel(slug[slug.length - 1]);
  return {
    title: name,
    description: `Browse ${name} from our catalog`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { lang, slug } = await params;
  const { features } = await getTenantConfig();

  const breadcrumbs = slug.map((segment, i) => ({
    label: slugToLabel(segment),
    href: `/${lang}/category/${slug.slice(0, i + 1).join("/")}`,
    isCurrent: i === slug.length - 1,
  }));

  if (features.searchEnabled) {
    const category = await resolveCategory(slug).catch(() => null);
    const categoryName = category?.name ?? slugToLabel(slug[slug.length - 1]);
    if (breadcrumbs.length > 0)
      breadcrumbs[breadcrumbs.length - 1].label = categoryName;

    return (
      <div className="min-h-screen bg-white">
        <Header lang={lang} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Breadcrumb lang={lang} breadcrumbs={breadcrumbs} />
          <CategorySearchClient lang={lang} categoryName={categoryName} slugs={slug} filterItems={features.filterItems} />
        </main>
      </div>
    );
  }

  const category = await resolveCategory(slug).catch(() => null);
  if (!category) notFound();
  const categoryName = category.name;
  if (breadcrumbs.length > 0)
    breadcrumbs[breadcrumbs.length - 1].label = categoryName;

  const products: ProductCardData[] = category.isHierarchy
    ? await getProductsForHierarchy(category.id)
    : await getProductsForNode(category.id);

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumb lang={lang} breadcrumbs={breadcrumbs} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
          {products.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <ProductGrid products={products} lang={lang} />
      </main>
    </div>
  );
}

function Breadcrumb({
  lang,
  breadcrumbs,
}: {
  lang: string;
  breadcrumbs: { label: string; href: string; isCurrent: boolean }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm text-gray-500">
        <li>
          <Link href={`/${lang}`} className="hover:text-gray-900 transition-colors">
            Home
          </Link>
        </li>
        {breadcrumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <li aria-hidden="true">›</li>
            <li>
              {crumb.isCurrent ? (
                <span className="font-medium text-gray-900">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-gray-900 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
