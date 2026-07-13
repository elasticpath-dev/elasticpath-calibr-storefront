import type { Meta, StoryObj } from "@storybook/react";
import { ProductDescription } from "./ProductDescription";

const meta: Meta<typeof ProductDescription> = {
  title: "Product/ProductDescription",
  component: ProductDescription,
  tags: ["autodocs"],
  argTypes: {
    truncate: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof ProductDescription>;

const long =
  "The DeWalt XR laser level delivers professional accuracy for both indoor and outdoor use. With a self-levelling range of ±4°, dual power modes, and IP65 dust and water resistance, it is built to handle the toughest job-site conditions. Includes carrying case and mounting clamp.";

export const Short: Story = {
  args: { description: "High-performance laser level for professional use." },
};

export const Long: Story = {
  args: { description: long },
};

export const Truncated: Story = {
  args: { description: long, truncate: true },
};
