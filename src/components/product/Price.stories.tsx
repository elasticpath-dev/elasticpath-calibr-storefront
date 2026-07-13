import type { Meta, StoryObj } from "@storybook/react";
import { Price } from "./Price";

const meta: Meta<typeof Price> = {
  title: "Product/Price",
  component: Price,
  tags: ["autodocs"],
  argTypes: {
    formatted: { control: "text" },
    originalFormatted: { control: "text" },
    className: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Price>;

export const Default: Story = {
  args: { formatted: "£29.99" },
};

export const OnSale: Story = {
  args: { formatted: "£19.99", originalFormatted: "£29.99" },
};

export const Free: Story = {
  args: { formatted: "Free" },
};

export const Large: Story = {
  args: { formatted: "£199.00", originalFormatted: "£249.00", className: "text-2xl" },
};
