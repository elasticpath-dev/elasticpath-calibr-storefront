"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  getAnOrder,
  getOrderShippingGroups,
  type OrderResponse,
  type OrderItemResponse,
  type ShippingGroupResponse,
} from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import {
  OrderItemsSection,
  OrderPriceSummary,
  OrderAddressCard,
} from "@/components/order/OrderLineItems";
import { Skeleton } from "@/components/ui/Skeleton";

export function OrderConfirmationDetail({ orderId }: { orderId: string }) {
  const t = useTranslations("account");

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [items, setItems] = useState<OrderItemResponse[]>([]);
  const [shippingGroups, setShippingGroups] = useState<ShippingGroupResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const client = createEpClient();
    getAnOrder({ client, path: { orderID: orderId }, query: { include: ["items"] } })
      .then(async (orderRes: any) => {
        if (cancelled) return;
        const data = orderRes?.data?.data as OrderResponse | undefined;
        if (!data) return;
        setOrder(data);
        const orderItems = (orderRes?.data?.included?.items as OrderItemResponse[]) ?? [];
        setItems(orderItems);

        // Only orders placed via B2B shipping groups carry a
        // shipping_group_id on their items — skip the extra lookup otherwise.
        const hasShippingGroupItems = orderItems.some(
          (item) => !!(item as any).shipping_group_id,
        );
        if (!hasShippingGroupItems) return;

        const groupsRes = await getOrderShippingGroups({
          client,
          path: { orderID: orderId },
        }).catch(() => null);
        if (!cancelled) {
          setShippingGroups((groupsRes?.data?.data as ShippingGroupResponse[]) ?? []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [orderId]);

  if (isLoading) return <ConfirmationSkeleton />;
  if (!order) return null;

  const hasShippingGroups = shippingGroups.length > 0;

  return (
    <div className="mt-10 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OrderItemsSection items={items} shippingGroups={shippingGroups} />
        </div>

        <div className="space-y-4">
          <OrderPriceSummary order={order} />
          {!hasShippingGroups && order.shipping_address && (
            <OrderAddressCard title={t("shippingAddress")} address={order.shipping_address as any} />
          )}
          {order.billing_address && (
            <OrderAddressCard title={t("billingAddress")} address={order.billing_address as any} />
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmationSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-gray-200">
            <Skeleton height={64} className="w-16 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton height={14} className="w-3/4" />
              <Skeleton height={12} className="w-24" />
              <Skeleton height={12} className="w-16" />
            </div>
            <Skeleton height={14} className="w-16 shrink-0 self-center" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <Skeleton height={16} className="w-24 mb-3" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={14} className="mb-2" />)}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <Skeleton height={16} className="w-32 mb-3" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={14} className="mb-1.5" />)}
        </div>
      </div>
    </div>
  );
}
