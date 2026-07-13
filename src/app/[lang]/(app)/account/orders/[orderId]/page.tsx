import { OrderDetail } from "@/components/account/tabs/OrderDetail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ lang: string; orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetail orderId={orderId} />;
}
