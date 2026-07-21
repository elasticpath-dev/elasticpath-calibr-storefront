"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  getCartItems,
  getShippingGroups,
  createShippingGroup,
  createAccountCartAssociation,
  deleteCartShippingGroup,
  updateACartItem,
  bulkUpdateItemsInCart,
  deleteACartItem,
  manageCarts,
  type CartItemObject,
} from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { SHIPPING_CUSTOM_ITEM_SKU_PREFIX } from "@/lib/cart-constants";
import { useCart } from "@/context/CartContext";
import { useAccountAddresses } from "@/hooks/use-account-addresses";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";

import { mapGroup, mergeGroupDuplicates } from "./shipping/helpers";
import { useShippingMethods } from "./shipping/useShippingMethods";
import { DeleteShipmentModal } from "./shipping/DeleteShipmentModal";
import { CreateShipmentForm } from "./shipping/CreateShipmentForm";
import { ShipmentCard } from "./shipping/ShipmentCard";
import { UnassignedItems } from "./shipping/UnassignedItems";
import type { Address, Group, CartItem, SplitState } from "./shipping/types";

function cleanInputs(inputs?: Record<string, unknown>): Record<string, unknown> {
  if (!inputs) return {};
  const { _ep_split_id: _, ...rest } = inputs;
  return rest;
}

// Multi-location: EP clears the top-level `location` on any cart-item update
// that omits it, so every shipping-group update must re-send it. The slug lives
// on the cart item's root `location` field (with a custom_inputs.location
// fallback for older lines whose root value was already cleared).
function locationOf(
  item?: { location?: unknown; custom_inputs?: Record<string, unknown> } | null,
): string | undefined {
  const root = item?.location;
  if (typeof root === "string" && root) return root;
  const ci = item?.custom_inputs?.location;
  return typeof ci === "string" && ci ? ci : undefined;
}

// custom_item rows are shippable like any other line item (e.g. a bespoke
// product added as a custom item), except the hidden shipping charge
// B2CDeliverySection adds — that one shouldn't be assignable to a shipment.
function isShippableItem(i: unknown): i is CartItemObject {
  const raw = i as { type?: string; sku?: unknown };
  const t = raw.type;
  if (t === "cart_item" || t === "subscription_item" || !t) return true;
  if (t === "custom_item") {
    return (
      typeof raw.sku !== "string" ||
      !raw.sku.startsWith(SHIPPING_CUSTOM_ITEM_SKU_PREFIX)
    );
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  onReadyChange?: (allAssigned: boolean) => void;
  onShippingCostChange?: (cents: number, currency: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onGroupsChange?: (groups: Group[]) => void;
};

export function ShippingGroupManager({ onReadyChange, onShippingCostChange, onLoadingChange, onGroupsChange }: Props) {
  const t = useTranslations("shipping");
  const { cartId, refreshCart } = useCart();
  const { addresses, addAddress } = useAccountAddresses();
  const { credentials } = useAuth();
  const shippingMethods = useShippingMethods(cartId);

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysFromToday = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();

  const methodList = useMemo(
    () => Object.entries(shippingMethods).sort(([, a], [, b]) => a.sort_order - b.sort_order),
    [shippingMethods],
  );

  // ── State ────────────────────────────────────────────────────────────────

  const [groups, setGroups] = useState<Group[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");

  const [groupMethods, setGroupMethods] = useState<Record<string, string>>({});

  // add-shipment form
  const [showForm, setShowForm] = useState(false);
  const [formAddressId, setFormAddressId] = useState<string>("");
  const [formInlineAddr, setFormInlineAddr] = useState<Partial<Address>>({});
  const [formMethodKey, setFormMethodKey] = useState<string>("");
  const [pickedItems, setPickedItems] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [formEstimateEnd, setFormEstimateEnd] = useState(sevenDaysFromToday);

  // split
  const [split, setSplit] = useState<SplitState | null>(null);

  // kebab menus
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const [unassignedMenuId, setUnassignedMenuId] = useState<string | null>(null);

  // drag
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // shipment name editing
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // delivery estimates
  const [groupEstimates, setGroupEstimates] = useState<Record<string, { start: string; end: string }>>({});

  // delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Load data ────────────────────────────────────────────────────────────

  const syncItems = useCallback(async () => {
    if (!cartId) return;
    const client = createEpClient();
    const res = await getCartItems({ client, path: { cartID: cartId } }).catch(() => null);
    if (!res) return;
    const raw = (res.data?.data ?? [])
      .filter(isShippableItem)
      .map((i) => ({
        ...i,
        imageHref: ((i as any).custom_inputs?.image_url as string | undefined) ?? ((i as any).image?.href as string | undefined),
      })) as CartItem[];
    setCartItems(await mergeGroupDuplicates(raw, cartId, client));
  }, [cartId]);

  const loadAll = useCallback(async () => {
    if (!cartId) return;
    setLoading(true);
    try {
      const client = createEpClient();
      if (credentials?.selected) {
        await createAccountCartAssociation({
          client,
          path: { cartID: cartId },
          body: { data: [{ type: "account", id: credentials.selected }] },
        }).catch(() => {});
      }

      const [groupRes, itemRes] = await Promise.all([
        getShippingGroups({ client, path: { cartID: cartId } }),
        getCartItems({ client, path: { cartID: cartId } }),
      ]);
      const loaded = (groupRes.data?.data ?? []).map(mapGroup);
      const liveIds = new Set(loaded.map((g) => g.id));
      const items = (itemRes.data?.data ?? [])
        .filter(isShippableItem)
        .map((i) => {
          const gid = (i as CartItemObject & { shipping_group_id?: string }).shipping_group_id;
          const imageHref = ((i as any).custom_inputs?.image_url as string | undefined) ?? ((i as any).image?.href as string | undefined);
          return gid && !liveIds.has(gid)
            ? { ...i, imageHref, shipping_group_id: undefined }
            : { ...i, imageHref };
        }) as CartItem[];

      setGroups(loaded);
      if (loaded.length > 0) setActiveTab((prev) => prev || loaded[0].id);
      setCartItems(await mergeGroupDuplicates(items, cartId, client));
    } finally {
      setLoading(false);
    }
  }, [cartId, credentials?.selected]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!cartId) return;
    try {
      const raw = localStorage.getItem(`ep-shipment-names-${cartId}`);
      if (raw) setGroupNames(JSON.parse(raw));
    } catch {}
  }, [cartId]);

  useEffect(() => {
    if (!cartId) return;
    try {
      const raw = localStorage.getItem(`ep-shipment-estimates-${cartId}`);
      if (raw) setGroupEstimates(JSON.parse(raw));
    } catch {}
  }, [cartId]);

  useEffect(() => {
    if (addresses.length > 0 && !formAddressId) setFormAddressId(addresses[0].id ?? "");
  }, [addresses, formAddressId]);

  useEffect(() => {
    if (methodList.length > 0 && !formMethodKey) setFormMethodKey(methodList[0][0]);
  }, [methodList, formMethodKey]);

  useEffect(() => {
    if (methodList.length === 0) return;
    setGroupMethods((prev) => {
      const next = { ...prev };
      const def = methodList[0]?.[0] ?? "";
      for (const g of groups) {
        if (next[g.id]) continue;
        const raw = g.shipping_type || def;
        const isKey = raw in shippingMethods;
        if (isKey) {
          next[g.id] = raw;
        } else {
          const found = methodList.find(([, m]) => m.shipping_method === raw);
          next[g.id] = found?.[0] ?? def;
        }
      }
      return next;
    });
  }, [groups, methodList, shippingMethods]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const unassigned = useMemo(() => cartItems.filter((i) => !i.shipping_group_id), [cartItems]);
  const itemsInGroup = useCallback(
    (gid: string) => cartItems.filter((i) => i.shipping_group_id === gid),
    [cartItems],
  );
  const allAssigned = cartItems.length > 0 && groups.length > 0 && unassigned.length === 0;

  useEffect(() => { onReadyChange?.(allAssigned); }, [allAssigned, onReadyChange]);
  useEffect(() => { onLoadingChange?.(loading); }, [loading, onLoadingChange]);
  useEffect(() => { onGroupsChange?.(groups); }, [groups, onGroupsChange]);

  useEffect(() => {
    if (!openMenuId && !unassignedMenuId) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-kebab-menu]")) {
        setOpenMenuId(null);
        setMoveMenuId(null);
        setUnassignedMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId, unassignedMenuId]);

  useEffect(() => {
    if (!onShippingCostChange || groups.length === 0) return;
    const total = groups.reduce((sum, g) => {
      const cost = shippingMethods[groupMethods[g.id] ?? ""]?.shipping_cost ?? 0;
      return sum + cost;
    }, 0);
    const currency = Object.values(shippingMethods)[0]?.currency ?? "USD";
    onShippingCostChange(total, currency);
  }, [groups, groupMethods, shippingMethods, onShippingCostChange]);

  // ── Resolve address for create form ──────────────────────────────────────

  const formAddress = useMemo<Address | null>(() => {
    if (formAddressId !== "new") {
      const a = (formAddressId ? addresses.find((x) => x.id === formAddressId) : undefined) ?? addresses[0];
      if (!a) { /* fall through */ } else
      return {
        first_name: a.first_name ?? "", last_name: a.last_name ?? "",
        line_1: a.line_1 ?? "", line_2: a.line_2 ?? "",
        city: a.city ?? "", postcode: a.postcode ?? "",
        county: a.county ?? "", country: a.country ?? "",
        region: a.region ?? "", phone_number: a.phone_number ?? "",
        company_name: a.company_name ?? "",
      };
    }
    if (!formInlineAddr.line_1) return null;
    return {
      first_name: formInlineAddr.first_name ?? "", last_name: formInlineAddr.last_name ?? "",
      line_1: formInlineAddr.line_1, line_2: formInlineAddr.line_2 ?? "",
      city: formInlineAddr.city ?? "", postcode: formInlineAddr.postcode ?? "",
      county: formInlineAddr.county ?? "", country: formInlineAddr.country ?? "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formAddressId, addresses, JSON.stringify(formInlineAddr)]);

  // ── Create shipment ───────────────────────────────────────────────────────

  async function handleCreateShipment() {
    if (!cartId) { toast.error(t("toastCartNotReady")); return; }
    const addr = formAddress;
    if (!addr) { toast.error(t("toastFillAddress")); return; }
    if (pickedItems.length === 0) { toast.error(t("toastSelectItems")); return; }
    if (!formEstimateEnd) { toast.error(t("toastSelectDate")); return; }
    const method = formMethodKey || methodList[0]?.[0] || "standard";
    setCreating(true);
    try {
      const beforeIds = new Set(groups.map((g) => g.id));
      const res = await createShippingGroup({
        client: createEpClient(),
        path: { cartID: cartId },
        body: {
          data: {
            type: "shipping_group",
            shipping_type: method,
            address: {
              first_name: addr.first_name, last_name: addr.last_name,
              phone_number: addr.phone_number ?? "", company_name: addr.company_name ?? "",
              line_1: addr.line_1 || "-", line_2: addr.line_2 ?? "",
              city: addr.city || "-", postcode: addr.postcode || "00000",
              county: addr.county ?? "", country: addr.country || "US",
              region: addr.region ?? "", instructions: "",
            },
          },
        },
      });

      if (res.error) {
        const detail = (res.error as any)?.errors?.[0]?.detail ?? JSON.stringify(res.error);
        throw new Error(detail);
      }

      const afterRes = await getShippingGroups({ client: createEpClient(), path: { cartID: cartId } });
      const allGroups = (afterRes.data?.data ?? []).map(mapGroup);
      const ng = allGroups.find((g) => !beforeIds.has(g.id));
      if (!ng) throw new Error(t("toastCreationFailed"));

      if (pickedItems.length > 0) {
        await bulkUpdateItemsInCart({
          client: createEpClient(),
          path: { cartID: cartId },
          body: {
            data: pickedItems.map((itemId) => {
              const cartItem = cartItems.find((i) => i.id === itemId);
              const location = locationOf(cartItem);
              return {
                id: itemId,
                quantity: cartItem?.quantity ?? 1,
                shipping_group_id: ng.id,
                custom_inputs: cleanInputs(cartItem?.custom_inputs),
                ...(location ? { location } : {}),
              };
            }),
          } as any,
        });
        setCartItems((prev) =>
          prev.map((i) =>
            pickedItems.includes(i.id ?? "") ? { ...i, shipping_group_id: ng.id, custom_inputs: cleanInputs(i.custom_inputs) } : i,
          ),
        );
      }

      setGroups((prev) => [...prev, ng]);
      setGroupMethods((prev) => ({ ...prev, [ng.id]: method }));
      setActiveTab(ng.id);

      const estimate = { start: "", end: formEstimateEnd };
      setGroupEstimates((prev) => {
        const next = { ...prev, [ng.id]: estimate };
        if (cartId) {
          try { localStorage.setItem(`ep-shipment-estimates-${cartId}`, JSON.stringify(next)); } catch {}
        }
        return next;
      });

      setShowForm(false);
      setPickedItems([]);
      setFormInlineAddr({});
      setFormEstimateEnd(sevenDaysFromToday);
      void refreshCart();
      toast.success(t("toastCreated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastCreateFailed"));
    } finally {
      setCreating(false);
    }
  }

  // ── Delete shipment ───────────────────────────────────────────────────────

  async function handleDelete(groupId: string) {
    if (!cartId) return;
    const client = createEpClient();
    const members = itemsInGroup(groupId);
    try {
      if (members.length > 0) {
        await bulkUpdateItemsInCart({
          client,
          path: { cartID: cartId },
          body: {
            data: members.map((i) => {
              const location = locationOf(i);
              return {
                id: i.id,
                shipping_group_id: "",
                ...(location ? { location } : {}),
              };
            }),
          } as any,
        });
      }
      await deleteCartShippingGroup({ client, path: { cartId, shippingGroupId: groupId } });

      const remaining = groups.filter((g) => g.id !== groupId);
      setGroups(remaining);
      setCartItems((prev) =>
        prev.map((i) =>
          i.shipping_group_id === groupId ? { ...i, shipping_group_id: undefined, custom_inputs: {} } : i,
        ),
      );
      setActiveTab(remaining[0]?.id ?? "");
      setGroupNames((prev) => {
        const next = { ...prev };
        delete next[groupId];
        if (cartId) {
          try { localStorage.setItem(`ep-shipment-names-${cartId}`, JSON.stringify(next)); } catch {}
        }
        return next;
      });
      setGroupEstimates((prev) => {
        const next = { ...prev };
        delete next[groupId];
        if (cartId) {
          try { localStorage.setItem(`ep-shipment-estimates-${cartId}`, JSON.stringify(next)); } catch {}
        }
        return next;
      });
      void refreshCart();
      toast.success(t("toastDeleted"));
    } catch {
      toast.error(t("toastDeleteFailed"));
    }
  }

  // ── Assign item (drag / click) ────────────────────────────────────────────

  async function assignItem(itemId: string, groupId: string) {
    if (!cartId) return;
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    const client = createEpClient();
    // custom_item rows have no product_id — only merge duplicates for actual
    // products, otherwise two distinct custom items (both product_id
    // undefined) would incorrectly collapse into one.
    const existingInTarget = groupId && item.product_id
      ? cartItems.find((i) => i.id !== itemId && i.product_id === item.product_id && i.shipping_group_id === groupId)
      : undefined;

    if (existingInTarget?.id) {
      const mergedQty = (existingInTarget.quantity ?? 0) + (item.quantity ?? 0);
      setCartItems((prev) =>
        prev
          .filter((i) => i.id !== itemId)
          .map((i) => i.id === existingInTarget.id ? { ...i, quantity: mergedQty } : i),
      );
      try {
        await Promise.all([
          deleteACartItem({ client, path: { cartID: cartId, cartitemID: itemId } }),
          updateACartItem({
            client,
            path: { cartID: cartId, cartitemID: existingInTarget.id },
            body: {
              data: {
                id: existingInTarget.id,
                quantity: mergedQty,
                shipping_group_id: groupId,
                ...(locationOf(existingInTarget) ? { location: locationOf(existingInTarget) } : {}),
              },
            } as any,
          }),
        ]);
        await syncItems();
        void refreshCart();
      } catch {
        toast.error(t("toastMoveFailed"));
        syncItems();
      }
    } else {
      const inputs = cleanInputs(item.custom_inputs);
      setCartItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, shipping_group_id: groupId || undefined, custom_inputs: inputs } : i,
        ),
      );
      try {
        await updateACartItem({
          client,
          path: { cartID: cartId, cartitemID: itemId },
          body: {
            data: {
              id: itemId,
              quantity: item.quantity ?? 1,
              shipping_group_id: groupId,
              custom_inputs: inputs,
              ...(locationOf(item) ? { location: locationOf(item) } : {}),
            },
          } as any,
        });
        await syncItems();
        void refreshCart();
      } catch {
        toast.error(t("toastMoveFailed"));
        syncItems();
      }
    }
  }

  // ── Remove item from shipment ─────────────────────────────────────────────

  async function removeFromShipment(itemId: string) {
    if (!cartId) return;
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    setCartItems((prev) =>
      prev.map((i) => i.id === itemId ? { ...i, shipping_group_id: undefined } : i),
    );
    const client = createEpClient();
    try {
      await updateACartItem({
        client,
        path: { cartID: cartId, cartitemID: itemId },
        body: {
          data: {
            id: itemId,
            shipping_group_id: "",
            ...(locationOf(item) ? { location: locationOf(item) } : {}),
          },
        } as any,
      });
      await syncItems();
      void refreshCart();
    } catch {
      toast.error(t("toastUnassignFailed"));
      syncItems();
    }
  }

  // ── Split ─────────────────────────────────────────────────────────────────

  async function handleSplitConfirm() {
    if (!split || !cartId) return;
    const { itemId, productId, currentGroupId, totalQty, splitQty, targetGroupId } = split;
    const cartTotalForProduct = cartItems
      .filter((i) => i.product_id === productId)
      .reduce((s, i) => s + (i.quantity ?? 0), 0);
    const safeSplitQty = Math.min(splitQty, totalQty - 1);
    const safeRemainQty = totalQty - safeSplitQty;

    if (safeSplitQty < 1) { toast.error(t("toastInvalidSplit")); setSplit(null); return; }
    if (totalQty > cartTotalForProduct) { toast.error(t("toastSplitExceeds")); setSplit(null); return; }

    const splitItem = cartItems.find((i) => i.id === itemId);
    const splitLoc = locationOf(splitItem);
    setSplit(null);
    const client = createEpClient();
    try {
      const existingInTarget = cartItems.find(
        (i) => i.id !== itemId && i.product_id === productId && i.shipping_group_id === targetGroupId,
      );

      if (existingInTarget?.id) {
        await Promise.all([
          updateACartItem({
            client,
            path: { cartID: cartId, cartitemID: itemId },
            body: {
              data: {
                type: splitItem?.type ?? "cart_item",
                id: itemId,
                quantity: safeRemainQty,
                shipping_group_id: currentGroupId,
                ...(splitLoc ? { location: splitLoc } : {}),
              },
            } as any,
          }),
          updateACartItem({
            client,
            path: { cartID: cartId, cartitemID: existingInTarget.id },
            body: {
              data: {
                type: existingInTarget.type ?? "cart_item",
                id: existingInTarget.id,
                quantity: (existingInTarget.quantity ?? 0) + safeSplitQty,
                shipping_group_id: targetGroupId,
                ...(locationOf(existingInTarget) ? { location: locationOf(existingInTarget) } : {}),
              },
            } as any,
          }),
        ]);
      } else {
        const splitId = `sp-${Date.now().toString(36)}`;
        await updateACartItem({
          client,
          path: { cartID: cartId, cartitemID: itemId },
          body: {
            data: {
              type: splitItem?.type ?? "cart_item", id: itemId, quantity: safeRemainQty,
              shipping_group_id: currentGroupId,
              custom_inputs: { _ep_split_id: `${splitId}-src` },
              ...(splitLoc ? { location: splitLoc } : {}),
            },
          } as any,
        });
        await manageCarts({
          client,
          path: { cartID: cartId },
          body: {
            data: {
              type: "cart_item", id: productId, quantity: safeSplitQty,
              custom_inputs: { _ep_split_id: `${splitId}-tgt` },
              ...(splitLoc ? { location: splitLoc } : {}),
            },
          } as any,
        });
        const cartRes = await getCartItems({ client, path: { cartID: cartId } });
        const newItem = (cartRes.data?.data ?? []).find(
          (i) => (i as CartItem).custom_inputs?.["_ep_split_id"] === `${splitId}-tgt` && (i as CartItem).id !== itemId,
        ) as CartItem | undefined;
        if (newItem?.id) {
          await updateACartItem({
            client,
            path: { cartID: cartId, cartitemID: newItem.id },
            body: {
              data: {
                type: newItem.type ?? "cart_item",
                id: newItem.id,
                quantity: safeSplitQty,
                shipping_group_id: targetGroupId,
                ...(splitLoc ? { location: splitLoc } : {}),
              },
            } as any,
          });
        }
      }
      await syncItems();
      toast.success(t("toastSplitSuccess"));
    } catch (err) {
      console.error("[split] error:", err);
      toast.error(t("toastSplitFailed"));
      syncItems();
    }
  }

  // ── Remove split ──────────────────────────────────────────────────────────

  async function removeSplit(productId: string) {
    if (!cartId) return;
    const parts = unassigned.filter(
      (i) => i.product_id === productId && i.custom_inputs?.["_ep_split_id"],
    );
    if (parts.length < 1) return;
    const totalQty = parts.reduce((s, i) => s + (i.quantity ?? 0), 0);
    const [keeper, ...rest] = parts;
    const client = createEpClient();
    const keeperInputs = cleanInputs(keeper.custom_inputs);
    setCartItems((prev) =>
      prev
        .filter((i) => !rest.some((r) => r.id === i.id))
        .map((i) => i.id === keeper.id ? { ...i, quantity: totalQty, custom_inputs: keeperInputs } : i),
    );
    try {
      await Promise.all([
        updateACartItem({
          client,
          path: { cartID: cartId, cartitemID: keeper.id! },
          body: {
            data: {
              type: keeper.type ?? "cart_item",
              id: keeper.id,
              quantity: totalQty,
              custom_inputs: keeperInputs,
              ...(locationOf(keeper) ? { location: locationOf(keeper) } : {}),
            },
          } as any,
        }),
        ...rest.map((i) =>
          deleteACartItem({ client, path: { cartID: cartId, cartitemID: i.id! } }),
        ),
      ]);
      await syncItems();
      toast.success(t("toastSplitRemoved", { count: totalQty }));
    } catch {
      toast.error(t("toastSplitRemoveFailed"));
      syncItems();
    }
  }

  // ── Shipment name helpers ─────────────────────────────────────────────────

  function getShipmentName(groupId: string, index: number) {
    return groupNames[groupId]?.trim() || t("shipmentN", { n: index + 1 });
  }

  function startEditName(groupId: string, current: string) {
    setEditingNameId(groupId);
    setEditingNameValue(current);
  }

  function saveEditName() {
    if (editingNameId) {
      const trimmed = editingNameValue.trim();
      const next = { ...groupNames, [editingNameId]: trimmed };
      setGroupNames(next);
      if (cartId) {
        try { localStorage.setItem(`ep-shipment-names-${cartId}`, JSON.stringify(next)); } catch {}
      }
    }
    setEditingNameId(null);
  }

  function cancelEditName() { setEditingNameId(null); }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  function onDragStart(itemId: string) { setDragItemId(itemId); setSplit(null); }
  function onDragEnd() { setDragItemId(null); setDragOverTarget(null); }
  function onDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (dragOverTarget !== targetId) setDragOverTarget(targetId);
  }
  function onDragLeave(e: React.DragEvent, targetId: string) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverTarget === targetId) setDragOverTarget(null);
  }
  function onDrop(e: React.DragEvent, groupId: string) {
    e.preventDefault();
    const lid = dragItemId || e.dataTransfer.getData("text/plain");
    if (lid) assignItem(lid, groupId);
    setDragItemId(null); setDragOverTarget(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return null;

  const activeGroup = groups.find((g) => g.id === activeTab) ?? null;
  const activeItems = activeGroup ? itemsInGroup(activeGroup.id) : [];
  const deleteTarget = deleteConfirmId ? groups.find((g) => g.id === deleteConfirmId) : null;
  const deleteTargetIndex = deleteTarget ? groups.findIndex((g) => g.id === deleteConfirmId) : -1;

  return (
    <div className="space-y-4">

      {/* ── Section header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{t("sectionTitle")}</h2>
        {unassigned.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => {
              setShowForm((p) => {
                if (!p) setFormMethodKey(methodList[0]?.[0] ?? "standard");
                return !p;
              });
              setSplit(null);
            }}
          >
            {t("addShipment")}
          </Button>
        )}
      </div>

      {/* ── Add-shipment form ─────────────────────────────────────────────── */}
      {showForm && (
        <CreateShipmentForm
          addresses={addresses}
          methodList={methodList}
          shippingMethods={shippingMethods}
          unassigned={unassigned}
          pickedItems={pickedItems}
          creating={creating}
          formAddressId={formAddressId}
          formInlineAddr={formInlineAddr}
          formMethodKey={formMethodKey}
          formEstimateEnd={formEstimateEnd}
          formAddress={formAddress}
          today={today}
          addAddress={addAddress}
          setFormAddressId={setFormAddressId}
          setFormInlineAddr={setFormInlineAddr}
          setFormMethodKey={setFormMethodKey}
          setFormEstimateEnd={setFormEstimateEnd}
          setPickedItems={setPickedItems}
          onSubmit={handleCreateShipment}
          onCancel={() => {
            setShowForm(false);
            setPickedItems([]);
            setFormEstimateEnd(sevenDaysFromToday);
          }}
        />
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {groups.length === 0 && !showForm && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center space-y-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-300">
            <path d="M16.5 9.4 7.55 4.24"/>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
          </svg>
          <p className="text-sm text-gray-500">{t("noShipments")}</p>
        </div>
      )}

      {/* ── Tab strip + content ───────────────────────────────────────────── */}
      {groups.length > 0 && (
        <>
          <div className="flex gap-0.5 border-b border-gray-200 flex-wrap -mb-px">
            {groups.map((g, i) => {
              const count = itemsInGroup(g.id).length;
              const active = activeTab === g.id;
              const over = dragOverTarget === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveTab(g.id)}
                  onDragOver={(e) => onDragOver(e, g.id)}
                  onDragLeave={(e) => onDragLeave(e, g.id)}
                  onDrop={(e) => onDrop(e, g.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 mb-[-1px] whitespace-nowrap transition-all ${
                    active
                      ? "border-brand-primary text-gray-900 bg-white"
                      : over
                      ? "border-brand-primary text-brand-primary bg-green-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col items-start gap-0">
                    <span className="text-sm font-semibold leading-tight">{getShipmentName(g.id, i)}</span>
                    {groupEstimates[g.id]?.end && (() => {
                      const [y, mo, d] = groupEstimates[g.id].end.split("-").map(Number);
                      const label = new Date(y, mo - 1, d).toLocaleDateString("en", { month: "short", day: "numeric" });
                      return <span className="text-[10px] font-medium text-gray-700 leading-tight">{label}</span>;
                    })()}
                  </div>
                  <Badge variant={active ? "success" : "default"} size="sm">
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <ShipmentCard
              activeGroup={activeGroup}
              grpIndex={groups.findIndex((g) => g.id === activeGroup.id)}
              activeItems={activeItems}
              isDragOver={dragOverTarget === activeGroup.id}
              groups={groups}
              groupEstimates={groupEstimates}
              groupMethods={groupMethods}
              shippingMethods={shippingMethods}
              editingNameId={editingNameId}
              editingNameValue={editingNameValue}
              split={split}
              openMenuId={openMenuId}
              moveMenuId={moveMenuId}
              dragItemId={dragItemId}
              getShipmentName={getShipmentName}
              setEditingNameValue={setEditingNameValue}
              setOpenMenuId={setOpenMenuId}
              setMoveMenuId={setMoveMenuId}
              setSplit={setSplit as any}
              startEditName={startEditName}
              saveEditName={saveEditName}
              cancelEditName={cancelEditName}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onAssignItem={assignItem}
              onRemoveFromShipment={removeFromShipment}
              onSplitConfirm={handleSplitConfirm}
              onDeleteRequest={setDeleteConfirmId}
            />
          )}

          {unassigned.length > 0 && (
            <UnassignedItems
              unassigned={unassigned}
              dragItemId={dragItemId}
              unassignedMenuId={unassignedMenuId}
              setUnassignedMenuId={setUnassignedMenuId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onRemoveSplit={removeSplit}
            />
          )}
        </>
      )}

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      {deleteConfirmId && deleteTarget && (
        <DeleteShipmentModal
          shipmentName={getShipmentName(deleteTarget.id, deleteTargetIndex)}
          members={itemsInGroup(deleteConfirmId)}
          onConfirm={() => { handleDelete(deleteConfirmId); setDeleteConfirmId(null); }}
          onClose={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
