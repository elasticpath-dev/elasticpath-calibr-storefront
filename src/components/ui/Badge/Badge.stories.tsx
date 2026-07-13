import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: "Default" },
};

export const Success: Story = {
  args: { variant: "success", children: "In stock" },
};

export const Warning: Story = {
  args: { variant: "warning", children: "Low stock" },
};

export const Error: Story = {
  args: { variant: "error", children: "Out of stock" },
};

export const Info: Story = {
  args: { variant: "info", children: "New" },
};

export const Outline: Story = {
  args: { variant: "outline", children: "Beta" },
};

export const WithDot: Story = {
  args: { variant: "success", dot: true, children: "Active" },
};

export const Small: Story = {
  args: { size: "sm", children: "Sm" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(["default", "success", "warning", "error", "info", "outline"] as const).map((v) => (
        <Badge key={v} variant={v} dot>{v}</Badge>
      ))}
    </div>
  ),
};
