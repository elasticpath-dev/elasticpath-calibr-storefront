import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { ShoppingCart, ArrowRight, Plus } from "lucide-react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: { onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "icon"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: "Add to Cart", variant: "primary" },
};

export const Secondary: Story = {
  args: { children: "Save for Later", variant: "secondary" },
};

export const Outline: Story = {
  args: { children: "View Details", variant: "outline" },
};

export const Ghost: Story = {
  args: { children: "Cancel", variant: "ghost" },
};

export const Destructive: Story = {
  args: { children: "Remove Item", variant: "destructive" },
};

export const LinkVariant: Story = {
  name: "Link",
  args: { children: "View all products", variant: "link" },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button leftIcon={<ShoppingCart size={16} />}>Add to Cart</Button>
      <Button rightIcon={<ArrowRight size={16} />} variant="outline">Continue</Button>
      <Button size="icon" aria-label="Add item"><Plus size={18} /></Button>
    </div>
  ),
};

export const Loading: Story = {
  args: { children: "Processing…", isLoading: true },
};

export const Disabled: Story = {
  args: { children: "Unavailable", disabled: true },
};

export const FullWidth: Story = {
  args: { children: "Proceed to Checkout", fullWidth: true },
};

export const ClickInteraction: Story = {
  args: { children: "Click me" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /click me/i });
    await userEvent.click(button);
    expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const DisabledClickBlocked: Story = {
  args: { children: "Disabled", disabled: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    expect(args.onClick).not.toHaveBeenCalled();
  },
};
