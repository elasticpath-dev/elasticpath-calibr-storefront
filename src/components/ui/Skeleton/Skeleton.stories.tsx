import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton, ProductCardSkeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Rectangle: Story = {
  args: { variant: "rect", width: 200, height: 80 },
};

export const Circle: Story = {
  args: { variant: "circle", width: 48, height: 48 },
};

export const Text: Story = {
  args: { variant: "text", width: 250 },
};

export const MultilineText: Story = {
  args: { variant: "text", lines: 4, width: 300 },
};

export const ProductCard: Story = {
  render: () => (
    <div className="w-60">
      <ProductCardSkeleton />
    </div>
  ),
};

export const ProductGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 w-[600px]">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  ),
};

export const ProfileRow: Story = {
  render: () => (
    <div className="flex items-center gap-3 w-72">
      <Skeleton variant="circle" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height={12} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
    </div>
  ),
};
