import { QuoteDetail } from "@/components/account/tabs/QuoteDetail";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ lang: string; quoteId: string }>;
}) {
  const { quoteId } = await params;
  return <QuoteDetail quoteId={quoteId} />;
}
