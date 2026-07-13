import { SubscriptionDetail } from "@/components/account/SubscriptionDetail";

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  const { subscriptionId } = await params;
  return <SubscriptionDetail subscriptionId={subscriptionId} />;
}
