"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  initializeCart,
  manageCarts,
  bulkUpdateItemsInCart,
  getCartItems,
  getCarts,
  createACart,
  deleteACart,
  updateACart,
  updateACartItem,
  deleteACartItem,
  deleteAllCartItems,
  type CartItemObject,
  type CartsResponse,
  type CartResponse,
  deleteAPromotionViaPromotionCode,
} from "@epcc-sdk/sdks-shopper";
import type { Client } from "@hey-api/client-fetch";
import { createEpClient } from "@/lib/api/ep-client";
import { SHIPPING_CUSTOM_ITEM_SKU_PREFIX } from "@/lib/cart-constants";
import { useAuth } from "@/context/AuthContext";

export type AppliedPromoCode = {
  id: string;
  code: string;
  name?: string;
  discountFormatted?: string;
};

export type ProductField = {
  key: string;
  label: string;
  value: string;
};

/** A per-SKU failure returned by the bulk add-to-cart endpoint. */
export type BulkOrderError = {
  sku?: string;
  title?: string;
  detail?: string;
};

export type PromotionSuggestion = {
  promotion_id: string;
  code: string;
  info: string;
  targets: Array<{
    skus: string[];
    quantity: number;
  }>;
};

export type BundleComponentItem = {
  componentName: string;
  productName: string;
  quantity: number;
  unitPriceFormatted?: string;
  lineTotalFormatted?: string;
};

export type CartItemDiscount = {
  promotionId: string;
  promotionName?: string;
  promotionDescription?: string;
  code: string;
  amountFormatted: string;
};

export type CartLineItem = {
  id: string;
  productId: string;
  sku?: string;
  /** PXM product slug (present when the line item has a product_id) — used to link to the PDP. */
  slug?: string;
  name: string;
  quantity: number;
  unitPriceAmount: number;
  currency: string;
  unitPriceFormatted: string;
  lineTotalFormatted: string;
  lineTotalOriginalFormatted?: string;
  imageHref?: string;
  bundleComponents?: BundleComponentItem[];
  customInputs?: Record<string, string>;
  productFields?: ProductField[];
  discounts?: CartItemDiscount[];
  isSubscription?: boolean;
  subscriptionPlanName?: string;
  subscriptionFrequency?: string;
  /** subscription_item's own resource ID — used as `id` instead of productId wherever this line item is copied into another resource (e.g. a quote). */
  subscriptionOfferingId?: string;
  subscriptionConfiguration?: { plan: string; pricing_option: string };
  /** Promotion-added free gift (cart item carries auto_add_quantity). */
  isFreeGift?: boolean;
  /** custom_inputs.is_digital — digital products skip shipping address collection. */
  isDigital?: boolean;
  /** type === "custom_item" — has no productId, so copy by sku/name/price instead wherever this line item is copied into another resource (e.g. a quote). */
  isCustomItem?: boolean;
};

export type CartSummary = {
  id: string;
  name: string;
  description?: string;
  totalFormatted?: string;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

const CART_STORAGE_KEY = "_store_ep_cart";

type CartContextValue = {
  items: CartLineItem[];
  itemCount: number;
  cartTotal: string;
  cartTotalAmount: number;
  cartSubtotal: string;
  cartSubtotalAmount: number;
  cartDiscount: string;
  cartDiscountAmount: number;
  cartShipping: string;
  cartShippingAmount: number;
  cartTax: string;
  cartTaxAmount: number;
  refreshCart: () => Promise<void>;
  cartId: string | null;
  allCarts: CartSummary[];
  isLoading: boolean;
  isInitializing: boolean;
  addItem: (
    productId: string,
    quantity?: number,
    customInputs?: Record<string, string>,
    subscriptionConfig?: { offeringId: string; plan: string; pricing_option: string; planName: string; frequency: string; imageUrl?: string },
    productFields?: ProductField[],
  ) => Promise<PromotionSuggestion[] | undefined>;
  addItems: (
    items: Array<{ productId: string; quantity: number; customInputs?: Record<string, string> }>,
  ) => Promise<PromotionSuggestion[] | undefined>;
  /** Adds items by SKU in one call (bulk / quick order). Returns how many
   * were added plus any per-SKU errors the API reported (e.g. unknown SKU). */
  addItemsBySku: (
    items: Array<{ sku: string; quantity: number }>,
  ) => Promise<{ addedCount: number; errors: BulkOrderError[] }>;
  addBundleItem: (
    productId: string,
    selectedOptions: Record<string, Record<string, number>>,
    quantity?: number,
  ) => Promise<PromotionSuggestion[] | undefined>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  bulkUpdateItems: (items: Array<{ cartItemId: string; quantity: number }>) => Promise<void>;
  clearCart: () => Promise<void>;
  switchCart: (newCartId: string) => Promise<void>;
  createCart: (name: string) => Promise<string | null>;
  updateCart: (id: string, name: string, description?: string) => Promise<void>;
  deleteCart: (targetCartId: string) => Promise<void>;
  clearCartById: (targetCartId: string) => Promise<void>;
  promotionSuggestions: PromotionSuggestion[] | null;
  clearPromotionSuggestions: () => void;
  showPromotionModal: boolean;
  dismissPromotionModal: () => void;
  appliedPromoCodes: AppliedPromoCode[];
  applyPromoCode: (
    code: string,
  ) => Promise<{ success: boolean; error?: string }>;
  removePromoCode: (code: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function toCartLineItem(
  item: CartItemObject,
  promotionsById?: Map<string, { name: string; description?: string }>,
): CartLineItem {
  const withoutTax = item.meta?.display_price?.without_tax;
  const raw = item as any;

  let bundleComponents: BundleComponentItem[] | undefined;
  const selectedOptions: Record<string, Record<string, number>> | undefined =
    raw.bundle_configuration?.selected_options;

  if (selectedOptions) {
    const componentProducts: any[] =
      raw.bundle_configuration?.component_products ?? [];
    const components: Record<string, { name: string }> = raw.components ?? {};
    const result: BundleComponentItem[] = [];

    for (const [componentSlug, selections] of Object.entries(selectedOptions)) {
      const componentName = components[componentSlug]?.name ?? componentSlug;
      for (const [productId, quantity] of Object.entries(selections)) {
        const product = componentProducts.find((p: any) => p.id === productId);
        const productName = product?.attributes?.name ?? productId;
        const dp = product?.meta?.display_price;
        const dpx = product?.meta?.display_price_extended;
        const unitPriceFormatted =
          dp?.without_tax?.formatted ?? dp?.with_tax?.formatted;
        const lineTotalFormatted =
          dpx?.without_tax?.value?.formatted ?? dpx?.with_tax?.value?.formatted;
        result.push({
          componentName,
          productName,
          quantity,
          unitPriceFormatted,
          lineTotalFormatted,
        });
      }
    }

    if (result.length > 0) bundleComponents = result;
  }

  const rawCustomInputs =
    raw.custom_inputs && typeof raw.custom_inputs === "object"
      ? (raw.custom_inputs as Record<string, unknown>)
      : undefined;

  const customInputs =
    rawCustomInputs && Object.keys(rawCustomInputs).length > 0
      ? (rawCustomInputs as Record<string, string>)
      : undefined;

  const rawProductFields = rawCustomInputs?.product_fields;
  const productFields: ProductField[] | undefined =
    Array.isArray(rawProductFields) && rawProductFields.length > 0
      ? (rawProductFields as ProductField[])
      : undefined;

  // Applied discounts from rule promotions
  const rawDiscounts:
    | Array<{
        id: string;
        code: string;
        promotion_source?: string;
        amount: { amount: number; currency: string };
      }>
    | undefined = Array.isArray(raw.discounts) ? raw.discounts : undefined;

  // Formatted discount amounts live in meta.display_price.discounts keyed by discount code
  const dpDiscounts: Record<string, { formatted?: string }> =
    raw.meta?.display_price?.discounts ?? {};

  const discounts: CartItemDiscount[] | undefined = rawDiscounts?.length
    ? rawDiscounts.map((d) => {
        const promo = promotionsById?.get(d.id);
        return {
          promotionId: d.id,
          promotionName: promo?.name,
          promotionDescription: promo?.description,
          code: d.code,
          amountFormatted:
            dpDiscounts[d.code]?.formatted ?? `${d.amount.amount}`,
        };
      })
    : undefined;

  const dp = raw.meta?.display_price;
  const lineTotalOriginalFormatted: string | undefined = discounts?.length
    ? (dp?.without_discount?.value?.formatted ?? undefined)
    : undefined;

  const isSubscription = raw.type === "subscription_item";
  const isCustomItem = raw.type === "custom_item";
  const imageHref =
    (raw.custom_inputs?.image_url as string | undefined) ||
    (item.image?.href || undefined);

  const subscriptionMeta = isSubscription
    ? (raw.custom_inputs?.subscription as { plan_name?: string; frequency?: string } | undefined)
    : undefined;

  const rawSubscriptionConfiguration = isSubscription
    ? (raw.subscription_configuration as { plan?: string; pricing_option?: string } | undefined)
    : undefined;
  const subscriptionConfiguration =
    rawSubscriptionConfiguration?.plan && rawSubscriptionConfiguration?.pricing_option
      ? {
          plan: rawSubscriptionConfiguration.plan,
          pricing_option: rawSubscriptionConfiguration.pricing_option,
        }
      : undefined;

  return {
    id: item.id ?? "",
    productId: item.product_id ?? "",
    sku: item.sku ?? undefined,
    // product_id present ⇒ PXM product ⇒ slug links to its PDP
    slug: item.product_id ? ((raw.slug as string | undefined) ?? undefined) : undefined,
    name: item.name ?? "",
    quantity: item.quantity ?? 1,
    unitPriceAmount: (withoutTax as any)?.unit?.amount ?? 0,
    currency: (withoutTax as any)?.unit?.currency ?? "USD",
    unitPriceFormatted: (withoutTax as any)?.unit?.formatted ?? "",
    lineTotalFormatted: (withoutTax as any)?.value?.formatted ?? "",
    lineTotalOriginalFormatted,
    imageHref,
    bundleComponents,
    customInputs,
    productFields,
    discounts,
    isSubscription: isSubscription || undefined,
    subscriptionPlanName: subscriptionMeta?.plan_name ?? undefined,
    subscriptionFrequency: subscriptionMeta?.frequency ?? undefined,
    subscriptionOfferingId: isSubscription
      ? (raw.subscription_offering_id as string | undefined)
      : undefined,
    subscriptionConfiguration,
    isFreeGift: raw.auto_add_quantity != null || undefined,
    isDigital:
      rawCustomInputs?.is_digital === true ||
      rawCustomInputs?.is_digital === "true" ||
      undefined,
    isCustomItem: isCustomItem || undefined,
  };
}

function extractAppliedPromoCodes(responseData: any): AppliedPromoCode[] {
  const seen = new Map<string, AppliedPromoCode>();

  // Cart-level promotion_items (explicit promo code entry)
  ((responseData?.data ?? []) as any[])
    .filter((i) => i.type === "promotion_item")
    .forEach((i) => {
      const code = (i.code ?? i.sku) as string;
      if (code && !seen.has(code)) {
        seen.set(code, {
          id: i.id as string,
          code,
          name: i.name as string | undefined,
          discountFormatted: i.meta?.display_price?.with_tax?.value
            ?.formatted as string | undefined,
        });
      }
    });

  // Line-item discounts whose code doesn't start with auto_ (manual promo codes)
  ((responseData?.data ?? []) as any[])
    .filter((i) => i.type === "cart_item" && Array.isArray(i.discounts))
    .forEach((item) => {
      (item.discounts as any[])
        .filter((d) => d.code && !String(d.code).startsWith("auto_"))
        .forEach((d) => {
          if (!seen.has(d.code)) {
            seen.set(d.code, {
              id: d.id as string,
              code: d.code as string,
            });
          }
        });
    });

  return Array.from(seen.values());
}

function filterSuggestions(
  raw: PromotionSuggestion[] | undefined,
): PromotionSuggestion[] {
  return (raw ?? []).filter((s) =>
    s.targets.some((t) => Array.isArray(t.skus) && t.skus.length > 0),
  );
}

function parseCartResponse(response: CartsResponse): {
  items: CartLineItem[];
  itemCount: number;
  cartTotal: string;
  cartTotalAmount: number;
  cartSubtotal: string;
  cartSubtotalAmount: number;
  cartDiscount: string;
  cartDiscountAmount: number;
  cartShipping: string;
  cartShippingAmount: number;
  cartTax: string;
  cartTaxAmount: number;
} {
  // Build promotion name lookup from included.promotions (present when include=promotions was passed)
  const promotionsById = new Map<
    string,
    { name: string; description?: string }
  >();
  const includedPromos = (response as any)?.included?.promotions;
  if (Array.isArray(includedPromos)) {
    includedPromos.forEach((p: any) => {
      if (p?.id && p?.name)
        promotionsById.set(p.id, {
          name: p.name,
          description: p.description ?? undefined,
        });
    });
  }

  const rawItems = (response.data ?? []).filter((i): i is CartItemObject => {
    const type = (i as CartItemObject).type;
    if (
      type === "cart_item" ||
      type === "subscription_item" ||
      type === undefined
    ) {
      return true;
    }
    // custom_item rows are shown in the cart like any other line item,
    // except the hidden shipping charge B2CDeliverySection adds — a shopper
    // shouldn't see their shipping charge listed as a cart item.
    if (type === "custom_item") {
      const sku = (i as any).sku;
      return (
        typeof sku !== "string" || !sku.startsWith(SHIPPING_CUSTOM_ITEM_SKU_PREFIX)
      );
    }
    return false;
  });
  const items = rawItems.map((item) => toCartLineItem(item, promotionsById));

  // Header cart count: number of line items (cart_item + subscription_item +
  // custom_item rows, not their quantities), excluding the hidden custom
  // item B2CDeliverySection uses to charge shipping — a shopper shouldn't
  // see their shipping charge counted as a cart item.
  const itemCount = (response.data ?? []).reduce((count, raw) => {
    const item = raw as any;
    const type = item.type as string | undefined;
    const isCountable =
      type === "cart_item" ||
      type === "subscription_item" ||
      type === undefined ||
      type === "custom_item";
    const isShippingCharge =
      type === "custom_item" &&
      typeof item.sku === "string" &&
      item.sku.startsWith(SHIPPING_CUSTOM_ITEM_SKU_PREFIX);
    return isCountable && !isShippingCharge ? count + 1 : count;
  }, 0);

  const cartTotal =
    response.meta?.display_price?.with_tax?.formatted ??
    response.meta?.display_price?.without_tax?.formatted ??
    "";
  const cartTotalAmount =
    (response.meta?.display_price?.with_tax as any)?.amount ??
    (response.meta?.display_price?.without_tax as any)?.amount ??
    0;
  const cartSubtotal =
    (response.meta?.display_price as any)?.without_tax?.formatted ?? "";
  const cartSubtotalAmount =
    (response.meta?.display_price as any)?.without_tax?.amount ?? 0;
  const cartDiscount =
    (response.meta?.display_price as any)?.discount?.formatted ?? "";
  const cartDiscountAmount =
    (response.meta?.display_price as any)?.discount?.amount ?? 0;
  const cartShipping =
    (response.meta?.display_price as any)?.shipping?.formatted ?? "";
  const cartShippingAmount =
    (response.meta?.display_price as any)?.shipping?.amount ?? 0;
  const cartTax =
    (response.meta?.display_price as any)?.tax?.formatted ?? "";
  const cartTaxAmount =
    (response.meta?.display_price as any)?.tax?.amount ?? 0;
  return {
    items,
    itemCount,
    cartTotal,
    cartTotalAmount,
    cartSubtotal,
    cartSubtotalAmount,
    cartDiscount,
    cartDiscountAmount,
    cartShipping,
    cartShippingAmount,
    cartTax,
    cartTaxAmount,
  };
}

function toCartSummary(
  c: CartResponse,
  itemCountOverride?: number,
): CartSummary {
  return {
    id: c.id ?? "",
    name: c.name ?? c.id ?? "Cart",
    description: c.description ?? undefined,
    totalFormatted:
      (c as any).meta?.display_price?.with_tax?.formatted ??
      (c as any).meta?.display_price?.without_tax?.formatted ??
      undefined,
    itemCount: itemCountOverride ?? (c as any).meta?.item_count ?? undefined,
    createdAt: (c as any).meta?.timestamps?.created_at ?? undefined,
    updatedAt:
      ((c as any).meta?.timestamps?.updated_at as string | undefined) ??
      undefined,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [epClient, setEpClient] = useState<Client | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [cartTotal, setCartTotal] = useState("");
  const [cartTotalAmount, setCartTotalAmount] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState("");
  const [cartSubtotalAmount, setCartSubtotalAmount] = useState(0);
  const [cartDiscount, setCartDiscount] = useState("");
  const [cartDiscountAmount, setCartDiscountAmount] = useState(0);
  const [cartShipping, setCartShipping] = useState("");
  const [cartShippingAmount, setCartShippingAmount] = useState(0);
  const [cartTax, setCartTax] = useState("");
  const [cartTaxAmount, setCartTaxAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [allCarts, setAllCarts] = useState<CartSummary[]>([]);
  const [appliedPromoCodes, setAppliedPromoCodes] = useState<
    AppliedPromoCode[]
  >([]);
  const [promotionSuggestions, setPromotionSuggestionsRaw] = useState<
    PromotionSuggestion[] | null
  >(null);
  const promotionSuggestionsRef = useRef<PromotionSuggestion[] | null>(null);

  // Restore from sessionStorage on mount (GET endpoint does not return promotion_suggestions)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ep_promo_suggestions");
      if (stored) {
        const parsed = JSON.parse(stored) as PromotionSuggestion[];
        if (parsed.length) {
          setPromotionSuggestionsRaw(parsed);
          promotionSuggestionsRef.current = parsed;
        }
      }
    } catch {}
  }, []);

  const setPromotionSuggestions = useCallback(
    (suggestions: PromotionSuggestion[] | null) => {
      promotionSuggestionsRef.current = suggestions;
      setPromotionSuggestionsRaw(suggestions);
      try {
        if (suggestions && suggestions.length) {
          sessionStorage.setItem(
            "ep_promo_suggestions",
            JSON.stringify(suggestions),
          );
        } else {
          sessionStorage.removeItem("ep_promo_suggestions");
        }
      } catch {}
    },
    [],
  );

  const clearPromotionSuggestions = useCallback(
    () => setPromotionSuggestions(null),
    [setPromotionSuggestions],
  );

  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const dismissPromotionModal = useCallback(
    () => setShowPromotionModal(false),
    [],
  );

  const prevIsAuthRef = useRef<boolean | null>(null);
  const mergedInSessionRef = useRef(false);

  // Initialise EP client + load active cart once on mount
  useEffect(() => {
    const client = createEpClient();
    setEpClient(client);

    initializeCart()
      .then(async (id) => {
        setCartId(id);
        const itemsRes = await getCartItems({
          client,
          path: { cartID: id },
          query: { include: "promotions" } as any,
        });
        if (itemsRes.data) {
          const parsed = parseCartResponse(itemsRes.data as any);
          setItems(parsed.items);
          setItemCount(parsed.itemCount);
          setCartTotal(parsed.cartTotal);
          setCartTotalAmount(parsed.cartTotalAmount);
          setCartSubtotal(parsed.cartSubtotal);
          setCartSubtotalAmount(parsed.cartSubtotalAmount);
          setCartDiscount(parsed.cartDiscount);
          setCartDiscountAmount(parsed.cartDiscountAmount);
          setCartShipping(parsed.cartShipping);
          setCartShippingAmount(parsed.cartShippingAmount);
          setCartTax(parsed.cartTax);
          setCartTaxAmount(parsed.cartTaxAmount);
          setAppliedPromoCodes(extractAppliedPromoCodes(itemsRes.data));
        }
        setIsInitializing(false);
      })
      .catch((err) => {
        console.error(err);
        setIsInitializing(false);
      });
  }, []);

  // On login: load account carts and merge the guest cart if needed.
  // On logout: clear cart list and create a fresh guest cart.
  useEffect(() => {
    if (!epClient) return;

    const wasAuth = prevIsAuthRef.current;
    prevIsAuthRef.current = isAuthenticated;

    if (!isAuthenticated) {
      setAllCarts([]);
      mergedInSessionRef.current = false;
      // On actual logout (not just initial render), create a fresh guest cart
      // so the user doesn't continue operating on their account cart.
      if (wasAuth === true) {
        createACart({
          client: epClient,
          body: { data: { name: "Cart" } } as any,
        })
          .then((res) => {
            const newId = res.data?.data?.id;
            if (newId) {
              localStorage.setItem(CART_STORAGE_KEY, newId);
              setCartId(newId);
              setItems([]);
              setItemCount(0);
              setCartTotal("");
            }
          })
          .catch(console.error);
      }
      return;
    }

    // Not yet ready: cartId resolves asynchronously via initializeCart()
    if (!cartId || mergedInSessionRef.current) return;

    (async () => {
      const res = await getCarts({ client: epClient }).catch(() => null);
      const allCartsRaw: any[] = res?.data?.data ?? [];
      const nonQuoteCarts = allCartsRaw.filter((c: any) => !c.is_quote);

      // Count cart_item refs from each cart's relationships (excludes promotions)
      // relationships.items.data is always populated when items exist — no reverse lookup needed
      setAllCarts(
        allCartsRaw.map((c: any) => {
          const itemRefs: any[] | null = c.relationships?.items?.data ?? null;
          const countFromRels =
            itemRefs !== null
              ? itemRefs.filter((i: any) => i.type === "cart_item").length
              : undefined;
          return toCartSummary(c, countFromRels);
        }),
      );

      // cartId is already an account cart — nothing to merge
      if (nonQuoteCarts.some((c: any) => c.id === cartId)) {
        mergedInSessionRef.current = true;
        return;
      }

      // cartId is a guest cart — merge it into an account cart
      let accountCartId = nonQuoteCarts[0]?.id as string | undefined;

      if (!accountCartId) {
        const createRes = await createACart({
          client: epClient,
          body: { data: { name: "Cart" } } as any,
        }).catch(() => null);
        accountCartId = createRes?.data?.data?.id;
        if (!accountCartId) return;
        setAllCarts((prev) => [
          ...prev,
          toCartSummary(createRes!.data!.data! as CartResponse),
        ]);
      }

      await manageCarts({
        client: epClient,
        path: { cartID: accountCartId },
        body: {
          data: { type: "cart_items", cart_id: cartId },
          options: { add_all_or_nothing: false },
        } as any,
      }).catch(console.error);

      localStorage.setItem(CART_STORAGE_KEY, accountCartId);
      mergedInSessionRef.current = true;

      // Load the merged account cart items with promotion details
      const mergedItemsRes = await getCartItems({
        client: epClient,
        path: { cartID: accountCartId },
        query: { include: "promotions" } as any,
      });
      setCartId(accountCartId);
      if (mergedItemsRes.data) {
        const parsed = parseCartResponse(mergedItemsRes.data as any);
        setItems(parsed.items);
        setItemCount(parsed.itemCount);
        setCartTotal(parsed.cartTotal);
        setCartTotalAmount(parsed.cartTotalAmount);
        setCartSubtotal(parsed.cartSubtotal);
        setCartSubtotalAmount(parsed.cartSubtotalAmount);
        setCartDiscount(parsed.cartDiscount);
        setCartDiscountAmount(parsed.cartDiscountAmount);
        setCartShipping(parsed.cartShipping);
        setCartShippingAmount(parsed.cartShippingAmount);
        setCartTax(parsed.cartTax);
        setCartTaxAmount(parsed.cartTaxAmount);
        setAppliedPromoCodes(extractAppliedPromoCodes(mergedItemsRes.data));
      }
    })();
  }, [isAuthenticated, epClient, cartId]);

  const loadItems = useCallback(async () => {
    if (!epClient || !cartId) return;
    const itemsRes = await getCartItems({
      client: epClient,
      path: { cartID: cartId },
      query: { include: "promotions" } as any,
    });
    if (itemsRes.data) {
      const parsed = parseCartResponse(itemsRes.data as any);
      setItems(parsed.items);
      setItemCount(parsed.itemCount);
      setCartTotal(parsed.cartTotal);
      setCartTotalAmount(parsed.cartTotalAmount);
      setCartSubtotal(parsed.cartSubtotal);
      setCartSubtotalAmount(parsed.cartSubtotalAmount);
      setCartDiscount(parsed.cartDiscount);
      setCartDiscountAmount(parsed.cartDiscountAmount);
      setCartShipping(parsed.cartShipping);
      setCartShippingAmount(parsed.cartShippingAmount);
      setCartTax(parsed.cartTax);
      setCartTaxAmount(parsed.cartTaxAmount);

      const suggestions = (itemsRes.data as any)?.meta
        ?.promotion_suggestions as PromotionSuggestion[] | undefined;
      const relevant = filterSuggestions(suggestions);
      if (relevant.length) setPromotionSuggestions(relevant);

      setAppliedPromoCodes(extractAppliedPromoCodes(itemsRes.data));
    }
  }, [epClient, cartId]);

  const addItem = useCallback(
    async (
      productId: string,
      quantity = 1,
      customInputs?: Record<string, string>,
      subscriptionConfig?: { offeringId: string; plan: string; pricing_option: string; planName: string; frequency: string; imageUrl?: string },
      productFields?: ProductField[],
    ): Promise<PromotionSuggestion[] | undefined> => {
      if (!epClient || !cartId) return undefined;
      setIsLoading(true);
      try {
        const nonEmptyFields = productFields?.filter((f) => f.value.trim() !== "") ?? [];

        const body: any = subscriptionConfig
          ? {
              data: {
                type: "subscription_item",
                id: subscriptionConfig.offeringId,
                quantity,
                subscription_configuration: {
                  plan: subscriptionConfig.plan,
                  pricing_option: subscriptionConfig.pricing_option,
                },
                custom_inputs: {
                  ...(customInputs ?? {}),
                  image_url: subscriptionConfig.imageUrl ?? "",
                  subscription: {
                    plan_name: subscriptionConfig.planName,
                    frequency: subscriptionConfig.frequency,
                  },
                  ...(nonEmptyFields.length > 0 ? { product_fields: nonEmptyFields } : {}),
                },
              },
            }
          : { data: { type: "cart_item", id: productId, quantity } };
        if (!subscriptionConfig) {
          const ci: Record<string, unknown> = { ...(customInputs ?? {}) };
          if (nonEmptyFields.length > 0) {
            ci.product_fields = nonEmptyFields;
          }
          if (Object.keys(ci).length > 0) {
            body.data.custom_inputs = ci;
          }
        }
        const prevIds = new Set(
          promotionSuggestionsRef.current?.map((s) => s.promotion_id) ?? [],
        );
        const res = await manageCarts({
          client: epClient,
          path: { cartID: cartId },
          body,
        });
        if (res.error) throw res.error;
        const suggestions = (res.data as any)?.meta?.promotion_suggestions as
          | PromotionSuggestion[]
          | undefined;
        const relevant = filterSuggestions(suggestions);
        setPromotionSuggestions(relevant.length ? relevant : null);
        if (relevant.some((s) => !prevIds.has(s.promotion_id)))
          setShowPromotionModal(true);
        await loadItems();
        return relevant.length ? relevant : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, loadItems],
  );

  const addItems = useCallback(
    async (
      items: Array<{ productId: string; quantity: number; customInputs?: Record<string, string> }>,
    ): Promise<PromotionSuggestion[] | undefined> => {
      if (!epClient || !cartId || items.length === 0) return undefined;
      setIsLoading(true);
      try {
        const prevIds = new Set(
          promotionSuggestionsRef.current?.map((s) => s.promotion_id) ?? [],
        );
        const res = await manageCarts({
          client: epClient,
          path: { cartID: cartId },
          body: {
            data: items.map(({ productId, quantity, customInputs }) => {
              const item: any = { type: "cart_item", id: productId, quantity };
              if (customInputs && Object.keys(customInputs).length > 0) {
                item.custom_inputs = customInputs;
              }
              return item;
            }),
          },
        });
        const suggestions = (res.data as any)?.meta?.promotion_suggestions as
          | PromotionSuggestion[]
          | undefined;
        const relevant = filterSuggestions(suggestions);
        setPromotionSuggestions(relevant.length ? relevant : null);
        if (relevant.some((s) => !prevIds.has(s.promotion_id)))
          setShowPromotionModal(true);
        await loadItems();
        return relevant.length ? relevant : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, loadItems],
  );

  const addItemsBySku = useCallback(
    async (
      items: Array<{ sku: string; quantity: number }>,
    ): Promise<{ addedCount: number; errors: BulkOrderError[] }> => {
      const clean = items.filter((i) => i.sku && i.quantity > 0);
      if (!epClient || !cartId || clean.length === 0) {
        return { addedCount: 0, errors: [] };
      }
      setIsLoading(true);
      try {
        const res = await manageCarts({
          client: epClient,
          path: { cartID: cartId },
          body: {
            data: clean.map(({ sku, quantity }) => ({
              type: "cart_item",
              sku,
              quantity,
            })),
          } as any,
        });
        const body = res.data as any;
        // The bulk endpoint returns HTTP 200 with successfully-added items in
        // `data` and any rejected SKUs in `errors` (each with meta.sku).
        const rawErrors = (body?.errors ?? res.error?.errors ?? []) as any[];
        const errors: BulkOrderError[] = rawErrors.map((e) => ({
          sku: e?.meta?.sku,
          title: e?.title,
          detail: e?.detail,
        }));
        const addedCount = Array.isArray(body?.data) ? body.data.length : 0;
        await loadItems();
        return { addedCount, errors };
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, loadItems],
  );

  const addBundleItem = useCallback(
    async (
      productId: string,
      selectedOptions: Record<string, Record<string, number>>,
      quantity = 1,
    ): Promise<PromotionSuggestion[] | undefined> => {
      if (!epClient || !cartId) return undefined;
      setIsLoading(true);
      try {
        const prevIds = new Set(
          promotionSuggestionsRef.current?.map((s) => s.promotion_id) ?? [],
        );
        const res = await manageCarts({
          client: epClient,
          path: { cartID: cartId },
          body: {
            data: {
              type: "cart_item",
              id: productId,
              quantity,
              bundle_configuration: { selected_options: selectedOptions },
            },
          } as any,
        });
        const suggestions = (res.data as any)?.meta?.promotion_suggestions as
          | PromotionSuggestion[]
          | undefined;
        const relevant = filterSuggestions(suggestions);
        setPromotionSuggestions(relevant.length ? relevant : null);
        if (relevant.some((s) => !prevIds.has(s.promotion_id)))
          setShowPromotionModal(true);
        await loadItems();
        return relevant.length ? relevant : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, loadItems],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      if (!epClient || !cartId) return;
      setIsLoading(true);
      try {
        const res = await deleteACartItem({
          client: epClient,
          path: { cartID: cartId, cartitemID: cartItemId },
        });
        const suggestions = (res.data as any)?.meta?.promotion_suggestions as
          | PromotionSuggestion[]
          | undefined;
        const relevant = filterSuggestions(suggestions);
        setPromotionSuggestions(relevant.length ? relevant : null);
        await loadItems();
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, loadItems, setPromotionSuggestions],
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      if (!epClient || !cartId) return;
      if (quantity <= 0) {
        await removeItem(cartItemId);
        return;
      }
      setIsLoading(true);
      try {
        const res = await updateACartItem({
          client: epClient,
          path: { cartID: cartId, cartitemID: cartItemId },
          body: { data: { type: "cart_item", quantity } },
        });
        if (res.error) throw res.error;
        const suggestions = (res.data as any)?.meta?.promotion_suggestions as
          | PromotionSuggestion[]
          | undefined;
        const relevant = filterSuggestions(suggestions);
        setPromotionSuggestions(relevant.length ? relevant : null);
        await loadItems();
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, removeItem, loadItems, setPromotionSuggestions],
  );

  const bulkUpdateItems = useCallback(
    async (items: Array<{ cartItemId: string; quantity: number }>) => {
      if (!epClient || !cartId || items.length === 0) return;
      setIsLoading(true);
      try {
        await bulkUpdateItemsInCart({
          client: epClient,
          path: { cartID: cartId },
          body: {
            data: items.map(({ cartItemId, quantity }) => ({ id: cartItemId, quantity })),
          },
        });
        await loadItems();
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, loadItems],
  );

  const clearCart = useCallback(async () => {
    if (!epClient || !cartId) return;
    setIsLoading(true);
    try {
      const res = await deleteAllCartItems({
        client: epClient,
        path: { cartID: cartId },
      });
      setItems([]);
      setItemCount(0);
      setCartTotal("");
      setCartTotalAmount(0);
      setCartShipping("");
      setCartShippingAmount(0);
      setCartTax("");
      setCartTaxAmount(0);
      const suggestions = (res.data as any)?.meta?.promotion_suggestions as
        | PromotionSuggestion[]
        | undefined;
      const relevant = filterSuggestions(suggestions);
      setPromotionSuggestions(relevant.length ? relevant : null);
    } finally {
      setIsLoading(false);
    }
  }, [epClient, cartId, setPromotionSuggestions]);

  const switchCart = useCallback(
    async (newCartId: string) => {
      if (!epClient || newCartId === cartId) return;
      setIsLoading(true);
      try {
        const itemsRes = await getCartItems({
          client: epClient,
          path: { cartID: newCartId },
          query: { include: "promotions" } as any,
        });
        localStorage.setItem(CART_STORAGE_KEY, newCartId);
        setCartId(newCartId);
        if (itemsRes.data) {
          const parsed = parseCartResponse(itemsRes.data as any);
          setItems(parsed.items);
          setItemCount(parsed.itemCount);
          setCartTotal(parsed.cartTotal);
          setCartTotalAmount(parsed.cartTotalAmount);
          setCartSubtotal(parsed.cartSubtotal);
          setCartSubtotalAmount(parsed.cartSubtotalAmount);
          setCartDiscount(parsed.cartDiscount);
          setCartDiscountAmount(parsed.cartDiscountAmount);
          setCartShipping(parsed.cartShipping);
          setCartShippingAmount(parsed.cartShippingAmount);
          setCartTax(parsed.cartTax);
          setCartTaxAmount(parsed.cartTaxAmount);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId],
  );

  const createCart = useCallback(
    async (name: string): Promise<string | null> => {
      if (!epClient) return null;
      setIsLoading(true);
      try {
        const res = await createACart({
          client: epClient,
          body: { data: { name } } as any,
        });
        const newCart = res.data?.data;
        if (!newCart?.id) return null;
        setAllCarts((prev) => [...prev, toCartSummary(newCart)]);
        await switchCart(newCart.id);
        return newCart.id;
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, switchCart],
  );

  const deleteCart = useCallback(
    async (targetCartId: string) => {
      if (!epClient) return;
      setIsLoading(true);
      try {
        await deleteACart({ client: epClient, path: { cartID: targetCartId } });
        const remaining = allCarts.filter((c) => c.id !== targetCartId);
        setAllCarts(remaining);
        if (targetCartId === cartId) {
          const next = remaining[0];
          if (next) {
            await switchCart(next.id);
          } else {
            setCartId(null);
            setItems([]);
            setItemCount(0);
            setCartTotal("");
            setCartTotalAmount(0);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, allCarts, switchCart],
  );

  const updateCart = useCallback(
    async (targetCartId: string, name: string, description?: string) => {
      if (!epClient) return;
      await updateACart({
        client: epClient,
        path: { cartID: targetCartId },
        body: { data: { name, description } },
      }).catch(() => null);
      setAllCarts((prev) =>
        prev.map((c) =>
          c.id === targetCartId ? { ...c, name, description } : c,
        ),
      );
    },
    [epClient],
  );

  const clearCartById = useCallback(
    async (targetCartId: string) => {
      if (!epClient) return;
      setIsLoading(true);
      try {
        await deleteAllCartItems({
          client: epClient,
          path: { cartID: targetCartId },
        });
        setAllCarts((prev) =>
          prev.map((c) =>
            c.id === targetCartId
              ? { ...c, itemCount: 0, totalFormatted: undefined }
              : c,
          ),
        );
        if (targetCartId === cartId) {
          setItems([]);
          setItemCount(0);
          setCartTotal("");
          setCartTotalAmount(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId],
  );

  const applyPromoCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      if (!epClient || !cartId) return { success: false };
      setIsLoading(true);
      try {
        const res = await manageCarts({
          client: epClient,
          path: { cartID: cartId },
          body: { data: { type: "promotion_item", code } } as any,
        });
        if (res.error) {
          const detail =
            (res.error as any)?.errors?.[0]?.detail ??
            (res.error as any)?.errors?.[0]?.title ??
            "Invalid promotion code";
          return { success: false, error: detail };
        }
        await loadItems();
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message ?? "Failed to apply promotion code",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, loadItems],
  );

  const removePromoCode = useCallback(
    async (code: string): Promise<void> => {
      if (!epClient || !cartId) return;
      setIsLoading(true);
      try {
        await deleteAPromotionViaPromotionCode({
          client: epClient,
          path: { cartID: cartId, promoCode: code },
        });
        await loadItems();
      } finally {
        setIsLoading(false);
      }
    },
    [epClient, cartId, loadItems],
  );

  const refreshCart = useCallback(async () => {
    try {
      await loadItems();
    } catch {
      /* silent — stale values stay until next successful refresh */
    }
  }, [loadItems]);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        cartTotal,
        cartTotalAmount,
        cartSubtotal,
        cartSubtotalAmount,
        cartDiscount,
        cartDiscountAmount,
        cartShipping,
        cartShippingAmount,
        cartTax,
        cartTaxAmount,
        refreshCart,
        cartId,
        allCarts,
        isLoading,
        isInitializing,
        addItem,
        addItems,
        addItemsBySku,
        addBundleItem,
        removeItem,
        updateQuantity,
        bulkUpdateItems,
        clearCart,
        switchCart,
        createCart,
        updateCart,
        deleteCart,
        clearCartById,
        promotionSuggestions,
        clearPromotionSuggestions,
        showPromotionModal,
        dismissPromotionModal,
        appliedPromoCodes,
        applyPromoCode,
        removePromoCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
