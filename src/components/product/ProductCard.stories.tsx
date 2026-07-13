import type { Meta, StoryObj } from "@storybook/react";
import { ProductCard } from "./ProductCard";
import type { ProductCardData } from "@/lib/api/products";

const meta: Meta<typeof ProductCard> = {
  title: "Product/ProductCard",
  component: ProductCard,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-72"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof ProductCard>;

const product: ProductCardData = {
  id: "abc123",
  slug: "dewalt-laser-level",
  name: "DeWalt XR Laser Level",
  priceFormatted: "£149.99",
  description: "Professional cross-line laser for indoor and outdoor use.",
  imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80",
};

export const Default: Story = {
  args: { product, lang: "en" },
};

export const NoImage: Story = {
  args: {
    product: { ...product, imageUrl: undefined },
    lang: "en",
  },
};

export const LongName: Story = {
  args: {
    product: {
      ...product,
      name: "Stanley FatMax Professional Combination Pliers with Insulated Grip 200mm",
    },
    lang: "en",
  },
};
