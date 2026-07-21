export type Address = {
  first_name: string; last_name: string;
  line_1: string; line_2?: string;
  city: string; postcode: string; county?: string;
  country: string; region?: string;
  phone_number?: string; company_name?: string;
};

export type Group = {
  id: string;
  shipping_type: string;
  address: Address;
};

export type CartItem = {
  id?: string;
  type?: string;
  product_id?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  imageHref?: string;
  shipping_group_id?: string;
  /** Multi-location stock location slug (root-level on the cart item). Must be
   * re-sent on every update or EP clears it. */
  location?: string;
  custom_inputs?: Record<string, unknown>;
  meta?: {
    display_price?: {
      with_tax?: { value?: { formatted?: string } };
      without_tax?: { value?: { formatted?: string } };
    };
  };
};

export type ShippingMethod = {
  shipping_method: string;
  shipping_cost: number;
  currency: string;
  shipping_message: string;
  delivery_estimate: { start: string; end: string; unit: string };
  sort_order: number;
};

export type SplitState = {
  itemId: string;
  productId: string;
  currentGroupId: string;
  totalQty: number;
  splitQty: number;
  targetGroupId: string;
};
