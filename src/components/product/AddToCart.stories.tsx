import type { Meta, StoryObj } from "@storybook/react";
import { AddToCart } from "./AddToCart";

const meta: Meta<typeof AddToCart> = {
  title: "Product/AddToCart",
  component: AddToCart,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["default", "full"] },
  },
};

export default meta;
type Story = StoryObj<typeof AddToCart>;

export const Default: Story = {
  args: { productId: "demo-product-id", variant: "default" },
};

export const Full: Story = {
  args: { productId: "demo-product-id", variant: "full" },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};
