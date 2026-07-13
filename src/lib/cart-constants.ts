/**
 * SKU prefix for the hidden custom item B2CDeliverySection uses to charge
 * shipping on the cart (see B2CDeliverySection.tsx). Shared with
 * CartContext so the header item count can exclude it — a shopper
 * shouldn't see their shipping charge counted as a "cart item".
 */
export const SHIPPING_CUSTOM_ITEM_SKU_PREFIX = "__shipping_";
