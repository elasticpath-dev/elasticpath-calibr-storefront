import type { Meta, StoryObj } from "@storybook/react";
import { ProductName } from "./ProductName";

const meta: Meta<typeof ProductName> = {
  title: "Product/ProductName",
  component: ProductName,
  tags: ["autodocs"],
  argTypes: {
    as: { control: "select", options: ["h1", "h2", "h3", "p"] },
  },
};

export default meta;
type Story = StoryObj<typeof ProductName>;

export const AsH1: Story = {
  args: { name: "DeWalt XR Laser Level Kit", as: "h1" },
};

export const AsH2: Story = {
  args: { name: "Copper Pipe 15mm × 3m", as: "h2" },
};

export const AsH3: Story = {
  args: { name: "Safety Workwear Jacket", as: "h3" },
};

export const LongName: Story = {
  args: {
    name: "Stanley FatMax Professional Combination Pliers with Insulated Grip 200mm",
    as: "h2",
  },
};
