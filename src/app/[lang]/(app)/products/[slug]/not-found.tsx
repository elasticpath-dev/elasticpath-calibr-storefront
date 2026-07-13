import { getLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/header/Header";
import Link from "next/link";

export default async function ProductNotFound() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("product"),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Header lang={locale} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-6xl font-bold text-gray-200 mb-6">404</p>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            {t("notFoundTitle")}
          </h1>
          <p className="text-gray-500 mb-8 max-w-md">
            {t("notFoundMessage")}
          </p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center h-12 px-6 text-base font-medium rounded-lg bg-brand-primary text-white hover:opacity-90 transition-all duration-150"
          >
            {t("notFoundCta")}
          </Link>
        </div>
      </main>
    </div>
  );
}
