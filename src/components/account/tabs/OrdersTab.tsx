"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { getOrderItems } from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { usePaginatedOrders } from "@/hooks/use-paginated-orders";
import { useCart } from "@/context/CartContext";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";

// ─── Date formatter ──────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateTime(iso: string | undefined): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return {
    date: `${day} ${mon} ${year}`,
    time: `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`,
  };
}

function DateCell({ iso }: { iso: string | undefined }) {
  const fmt = formatDateTime(iso);
  if (!fmt) return <span className="text-gray-400">—</span>;
  return (
    <span className="whitespace-nowrap">
      <span className="block text-sm text-gray-800">{fmt.date}</span>
      <span className="block text-xs text-gray-400">{fmt.time}</span>
    </span>
  );
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  complete: "success",
  incomplete: "warning",
  cancelled: "error",
  processing: "info",
};

const PAYMENT_VARIANT: Record<string, BadgeVariant> = {
  paid: "success",
  unpaid: "error",
  authorized: "info",
  refunded: "warning",
  partially_paid: "warning",
  partially_authorized: "info",
};

const SHIPPING_VARIANT: Record<string, BadgeVariant> = {
  fulfilled: "success",
  unfulfilled: "warning",
};

function StatusBadge({ value, map }: { value?: string; map: Record<string, BadgeVariant> }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const variant = map[value] ?? "default";
  const label = value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant={variant} dot size="sm">{label}</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

const SKELETON_ROWS = 5;

export function OrdersTab() {
  const t = useTranslations("account");
  const { orders, currentPage, totalPages, isLoading, setPage } = usePaginatedOrders();
  const { addItems } = useCart();
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "en";

  const [reorderingIds, setReorderingIds] = useState<Set<string>>(new Set());

  async function handleReorder(orderId: string) {
    setReorderingIds((prev) => new Set([...prev, orderId]));
    try {
      const client = createEpClient();
      const res = await getOrderItems({ client, path: { orderID: orderId } });
      const items = (res.data?.data ?? [])
        .filter((item) => item.product_id && item.quantity)
        .map((item) => ({ productId: item.product_id!, quantity: item.quantity! }));
      if (items.length > 0) await addItems(items);
    } finally {
      setReorderingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  const columns = [
    t("orderColumnId"),
    t("orderColumnDate"),
    t("orderColumnItems"),
    t("orderColumnStatus"),
    t("orderColumnPayment"),
    t("orderColumnShipping"),
    t("orderColumnTotal"),
    "",
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">{t("tabOrders")}</h2>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-24" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="mb-1 w-24" /><Skeleton height={11} className="w-16" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-8" /></td>
                  <td className="px-4 py-4"><Skeleton height={20} className="w-20 rounded-full" /></td>
                  <td className="px-4 py-4"><Skeleton height={20} className="w-16 rounded-full" /></td>
                  <td className="px-4 py-4"><Skeleton height={20} className="w-20 rounded-full" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-16" /></td>
                  <td className="px-4 py-4 w-24" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShoppingBag size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-500">{t("noOrders")}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const isReordering = reorderingIds.has(order.id);
                  const displayId = order.orderNumber ?? order.id.slice(0, 8).toUpperCase();
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          href={`/${lang}/account/orders/${order.id}`}
                          className="text-sm font-mono font-medium text-brand-primary hover:underline"
                        >
                          {displayId}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <DateCell iso={order.createdAt} />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {order.itemCount ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge value={order.status} map={STATUS_VARIANT} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge value={order.payment} map={PAYMENT_VARIANT} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge value={order.shipping} map={SHIPPING_VARIANT} />
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {order.totalFormatted ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<RotateCcw size={13} />}
                          disabled={isReordering}
                          onClick={() => handleReorder(order.id)}
                        >
                          {isReordering ? t("reordering") : t("reorder")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-4 justify-end"
          />
        </>
      )}
    </div>
  );
}
