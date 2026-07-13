import { QuoteRequestFlow } from "@/components/quote/QuoteRequestFlow";
import { Logo } from "@/components/header/Logo";

type Props = { params: Promise<{ lang: string }> };

export default async function QuoteRequestPage({ params }: Props) {
  const { lang } = await params;
  return <QuoteRequestFlow lang={lang} logo={<Logo lang={lang} />} />;
}
