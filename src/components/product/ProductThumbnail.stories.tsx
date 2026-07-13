import type { Meta, StoryObj } from "@storybook/react";
import { ProductThumbnail } from "./ProductThumbnail";

const meta: Meta<typeof ProductThumbnail> = {
  title: "Product/ProductThumbnail",
  component: ProductThumbnail,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-64 h-64">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProductThumbnail>;

export const WithImage: Story = {
  args: {
    imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80",
    name: "Sunglasses",
  },
};

export const Placeholder: Story = {
  args: { name: "Product with no image" },
};
