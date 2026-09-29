import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header/Header";
import { VehicleFinder } from "@/components/vehicle-finder/VehicleFinder";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("vehicleFinder");
  return { title: t("title"), description: t("subtitle") };
}

export default async function VehicleFinderPage({ params }: Props) {
  const { lang } = await params;
  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main className="container-shell px-4 sm:px-6 lg:px-8 py-10">
        <VehicleFinder lang={lang} />
      </main>
    </div>
  );
}
