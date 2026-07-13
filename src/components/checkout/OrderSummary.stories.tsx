import type { Meta, StoryObj } from "@storybook/react";
import { OrderSummary } from "./OrderSummary";
import type { CartLineItem } from "@/context/CartContext";

const meta: Meta<typeof OrderSummary> = {
  title: "Checkout/OrderSummary",
  component: OrderSummary,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrderSummary>;

const items: CartLineItem[] = [
  {
    id: "item-1",
    productId: "prod-1",
    name: "DeWalt XR Laser Level",
    sku: "DW-LL-001",
    quantity: 1,
    unitPriceFormatted: "£149.99",
    unitPriceAmount: 14999,
    lineTotalFormatted: "£149.99",
    currency: "GBP",
    imageHref: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&q=80",
  },
  {
    id: "item-2",
    productId: "prod-2",
    name: "Copper Pipe 15mm × 3m",
    sku: "CP-15-3M",
    quantity: 3,
    unitPriceFormatted: "£8.99",
    unitPriceAmount: 899,
    lineTotalFormatted: "£26.97",
    currency: "GBP",
  },
];

export const WithItems: Story = {
  args: { items, cartTotal: "£176.96" },
};

export const SingleItem: Story = {
  args: { items: [items[0]], cartTotal: "£149.99" },
};

export const Empty: Story = {
  args: { items: [], cartTotal: "" },
};
