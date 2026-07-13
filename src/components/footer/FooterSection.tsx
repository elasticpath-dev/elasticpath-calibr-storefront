import { getPlasmicConfig } from "@/lib/plasmic-config";
import { getPlasmicComponentData } from "@/components/plasmic/plasmic-data";
import PlasmicContent from "@/components/plasmic/PlasmicContent";
import { Footer } from "./Footer";

type FooterSectionProps = {
  lang: string;
};

export async function FooterSection({ lang }: FooterSectionProps) {
  const plasmicConfig = await getPlasmicConfig();
  if (!plasmicConfig.enabled) {
    return <Footer lang={lang} />;
  }

  const plasmicData = await getPlasmicComponentData("footer");

  if (!plasmicData) {
    return <Footer lang={lang} />;
  }

  return <PlasmicContent component="footer" prefetchedData={plasmicData} componentProps={{ lang }} />;
}
