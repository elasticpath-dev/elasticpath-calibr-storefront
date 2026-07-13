import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb } from "./Breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
  title: "UI/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
  args: {
    items: [
      { label: "Shop", href: "/shop" },
      { label: "Women", href: "/shop/women" },
      { label: "Dresses" },
    ],
  },
};

export const NoHome: Story = {
  args: {
    showHome: false,
    items: [
      { label: "Collections", href: "/collections" },
      { label: "Summer Edit" },
    ],
  },
};

export const SingleItem: Story = {
  args: { items: [{ label: "About" }] },
};

export const Deep: Story = {
  args: {
    items: [
      { label: "Shop", href: "/shop" },
      { label: "Men", href: "/shop/men" },
      { label: "Tops", href: "/shop/men/tops" },
      { label: "T-Shirts", href: "/shop/men/tops/t-shirts" },
      { label: "Graphic Tees" },
    ],
  },
};
