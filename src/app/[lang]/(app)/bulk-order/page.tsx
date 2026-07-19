import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header/Header";
import { BulkOrderTabs } from "@/components/bulk-order/BulkOrderTabs";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "bulkOrder" });
  return { title: t("pageTitle") };
}

export default async function BulkOrderPage({ params }: Props) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "bulkOrder" });

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main className="container-shell px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          {t("pageTitle")}
        </h1>
        <div className="max-w-4xl">
          <BulkOrderTabs />
        </div>
      </main>
    </div>
  );
}
