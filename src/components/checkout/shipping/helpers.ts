import { updateACartItem, deleteACartItem, type ShippingGroupResponse } from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import type { CartItem, Group } from "./types";

export function toCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export function mapGroup(r: ShippingGroupResponse): Group {
  return {
    id: r.id ?? "",
    shipping_type: r.shipping_type ?? "",
    address: {
      first_name: r.address?.first_name ?? "",
      last_name: r.address?.last_name ?? "",
      line_1: r.address?.line_1 ?? "",
      line_2: r.address?.line_2 ?? "",
      city: r.address?.city ?? "",
      postcode: r.address?.postcode ?? "",
      county: r.address?.county ?? "",
      country: r.address?.country ?? "",
      region: r.address?.region,
      phone_number: r.address?.phone_number ?? "",
      company_name: r.address?.company_name ?? "",
    },
  };
}

export async function mergeGroupDuplicates(
  items: CartItem[],
  cartId: string,
  client: ReturnType<typeof createEpClient>,
): Promise<CartItem[]> {
  const byKey = new Map<string, CartItem[]>();
  for (const item of items) {
    const gid = item.shipping_group_id;
    if (!gid || !item.product_id) continue;
    const key = `${item.product_id}::${gid}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(item);
  }

  const deleteIds: string[] = [];
  const updateOps: { id: string; qty: number; gid: string; itemType: string }[] = [];

  for (const [, dupes] of byKey) {
    if (dupes.length <= 1) continue;
    const mergedQty = dupes.reduce((s, i) => s + (i.quantity ?? 0), 0);
    const [keep, ...rest] = dupes;
    updateOps.push({ id: keep.id!, qty: mergedQty, gid: keep.shipping_group_id!, itemType: keep.type ?? "cart_item" });
    rest.forEach((r) => deleteIds.push(r.id!));
  }

  if (deleteIds.length === 0) return items;

  await Promise.all([
    ...deleteIds.map((id) =>
      deleteACartItem({ client, path: { cartID: cartId, cartitemID: id } }).catch(() => {}),
    ),
    ...updateOps.map(({ id, qty, gid, itemType }) =>
      updateACartItem({
        client,
        path: { cartID: cartId, cartitemID: id },
        body: { data: { type: itemType, id, quantity: qty, shipping_group_id: gid } } as any,
      }).catch(() => {}),
    ),
  ]);

  return items
    .filter((i) => !deleteIds.includes(i.id!))
    .map((i) => {
      const u = updateOps.find((u) => u.id === i.id);
      return u ? { ...i, quantity: u.qty } : i;
    });
}

export function formatEstimateDate(isoDate: string): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
