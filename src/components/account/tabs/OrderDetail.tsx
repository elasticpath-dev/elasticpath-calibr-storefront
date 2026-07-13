"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getAnOrder,
  getOrderShippingGroups,
  type OrderResponse,
  type OrderItemResponse,
  type ShippingGroupResponse,
} from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  StatusBadge,
  STATUS_VARIANT,
  PAYMENT_VARIANT,
  SHIPPING_VARIANT,
  OrderItemsSection,
  OrderPriceSummary,
  OrderAddressCard,
  formatDateTime,
} from "@/components/order/OrderLineItems";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export function OrderDetail({ orderId }: { orderId: string }) {
  const t = useTranslations("account");
  const { isAuthenticated } = useAuth();
  const { addItems } = useCart();
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "en";

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [items, setItems] = useState<OrderItemResponse[]>([]);
  const [shippingGroups, setShippingGroups] = useState<ShippingGroupResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);

    const client = createEpClient();
    Promise.all([
      getAnOrder({ client, path: { orderID: orderId }, query: { include: ["items"] } }),
      getOrderShippingGroups({ client, path: { orderID: orderId } }),
    ])
      .then(([orderRes, groupsRes]: [any, any]) => {
        if (cancelled) return;
        const data = orderRes?.data?.data as OrderResponse | undefined;
        if (!data) { setNotFound(true); return; }
        setOrder(data);
        setItems((orderRes?.data?.included?.items as OrderItemResponse[]) ?? []);
        setShippingGroups((groupsRes?.data?.data as ShippingGroupResponse[]) ?? []);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [orderId, isAuthenticated]);

  async function handleReorder() {
    const reorderItems = items
      .filter((item) => item.product_id && item.quantity)
      .map((item) => ({ productId: item.product_id!, quantity: item.quantity! }));
    if (reorderItems.length === 0) return;
    setIsReordering(true);
    try {
      await addItems(reorderItems);
    } finally {
      setIsReordering(false);
    }
  }

  const displayId = order?.order_number ?? orderId;
  const hasShippingGroups = shippingGroups.length > 0;

  return (
    <div>
      {/* Back link + reorder */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/${lang}/account/orders`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={15} />
          {t("backToOrders")}
        </Link>
        {!isLoading && order && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RotateCcw size={13} />}
            disabled={isReordering}
            onClick={handleReorder}
          >
            {isReordering ? t("reordering") : t("reorder")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : notFound ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-sm font-medium text-gray-500">{t("orderNotFound")}</p>
        </div>
      ) : order ? (
        <div className="space-y-6">
          {/* Order header */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{t("orderColumnId")}</p>
                <p className="text-lg font-semibold font-mono text-gray-900">{displayId}</p>
                {order.meta?.timestamps?.created_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateTime(order.meta.timestamps.created_at)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={order.status} map={STATUS_VARIANT} />
                <StatusBadge value={order.payment} map={PAYMENT_VARIANT} />
                <StatusBadge value={order.shipping} map={SHIPPING_VARIANT} />
              </div>
            </div>
          </div>

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
      ) : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <Skeleton height={28} className="w-40 mb-2" />
        <Skeleton height={14} className="w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
    </div>
  );
}
