import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { Logo } from "@/components/header/Logo";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const { lang } = await params;
  return <CheckoutFlow lang={lang} logo={<Logo lang={lang} />} />;
}
