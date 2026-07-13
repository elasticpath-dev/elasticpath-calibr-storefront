import { notFound } from "next/navigation";
import { Header } from "@/components/header/Header";
import { MembershipPlans } from "@/components/membership/MembershipPlans";
import { getOfferingById } from "@/lib/api/subscriptions";
import { getPlasmicConfig } from "@/lib/plasmic-config";
import { getPlasmicComponentData } from "@/components/plasmic/plasmic-data";
import PlasmicContent from "@/components/plasmic/PlasmicContent";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ lang: string; offeringId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offeringId } = await params;
  const offering = await getOfferingById(offeringId).catch(() => null);
  return {
    title: offering?.name ?? "Membership",
    description: offering?.description,
  };
}

export default async function MembershipPage({ params }: Props) {
  const { lang, offeringId } = await params;

  const [offering, plasmicConfig] = await Promise.all([
    getOfferingById(offeringId).catch(() => null),
    getPlasmicConfig(),
  ]);
  if (!offering) notFound();

  // CMS-editable content spots around the plan cards — e.g. a custom intro
  // or promo copy above, FAQs or cross-sell below. Left blank in Plasmic,
  // each spot simply renders nothing.
  const [beforeContent, afterContent] = plasmicConfig.enabled
    ? await Promise.all([
        getPlasmicComponentData("Membership-Top"),
        getPlasmicComponentData("Membership-Bottom"),
      ])
    : [null, null];

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {beforeContent && (
          <div className="mb-8">
            <PlasmicContent
              component="Membership-Top"
              prefetchedData={beforeContent}
            />
          </div>
        )}

        <MembershipPlans offering={offering} />

        {afterContent && (
          <div className="mt-12">
            <PlasmicContent
              component="Membership-Bottom"
              prefetchedData={afterContent}
            />
          </div>
        )}
      </main>
    </div>
  );
}
