import { getPlasmicConfig } from "@/lib/plasmic-config";
import { getPlasmicComponentData } from "@/components/plasmic/plasmic-data";
import PlasmicContent from "@/components/plasmic/PlasmicContent";
import { StorefrontFooter } from "./StorefrontFooter";

type FooterProps = {
  lang: string;
};

export async function Footer({ lang }: FooterProps) {
  const plasmicConfig = await getPlasmicConfig();
  if (!plasmicConfig.enabled) {
    return <StorefrontFooter lang={lang} />;
  }

  const plasmicData = await getPlasmicComponentData("footer");

  if (!plasmicData) {
    return <StorefrontFooter lang={lang} />;
  }

  return (
    <PlasmicContent
      component="footer"
      prefetchedData={plasmicData}
      componentProps={{ lang }}
    />
  );
}
