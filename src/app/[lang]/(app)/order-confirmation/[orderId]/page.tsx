import { Header } from "@/components/header/Header";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OrderConfirmationDetail } from "@/components/order/OrderConfirmationDetail";

type Props = {
  params: Promise<{ lang: string; orderId: string }>;
};

export const metadata: Metadata = {
  title: "Order Confirmed",
};

export default async function OrderConfirmationPage({ params }: Props) {
  const { lang, orderId } = await params;
  const t = await getTranslations("orderConfirmation");

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main className="container-shell px-4 sm:px-6 lg:px-8 py-20">
        {/* Success icon */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-brand-accent/20 flex items-center justify-center">
              <CheckCircle size={40} className="text-brand-secondary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{t("title")}</h1>
          <p className="text-gray-500 text-base max-w-md">{t("subtitle")}</p>
        </div>

        {/* Order reference card */}
        <div className="mt-10 rounded-2xl border border-gray-100 bg-gray-50 px-8 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {t("detailsTitle")}
            </h2>
          </div>
          <div className="space-y-2">
            <DetailRow label={t("orderId")} value={orderId} mono />
            <DetailRow label={t("status")} value={t("statusProcessing")} />
          </div>
        </div>

        {/* Order items, summary, addresses */}
        <OrderConfirmationDetail orderId={orderId} />

        {/* What's next */}
        <div className="mt-8 rounded-2xl border border-gray-100 px-8 py-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {t("nextTitle")}
          </h2>
          <ol className="space-y-2 text-sm text-gray-600">
            {(["nextStep1", "nextStep2", "nextStep3"] as const).map((key, i) => (
              <li key={key} className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand-secondary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {t(key)}
              </li>
            ))}
          </ol>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t("continueShopping")}
            <ArrowRight size={16} />
          </Link>
          <Link
            href={`/${lang}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t("backToHome")}
          </Link>
        </div>
      </main>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={mono ? "font-mono text-gray-800 text-xs bg-gray-100 px-2 py-0.5 rounded" : "font-medium text-gray-800"}>
        {value}
      </span>
    </div>
  );
}
