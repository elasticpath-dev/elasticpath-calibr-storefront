import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Alert } from "./Alert";

const meta: Meta<typeof Alert> = {
  title: "UI/Alert",
  component: Alert,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: {
    variant: "info",
    title: "Heads up",
    children: "Your cart will expire in 30 minutes.",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    title: "Order placed",
    children: "We'll email you a confirmation shortly.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Low stock",
    children: "Only 3 items left in your size.",
  },
};

export const Error: Story = {
  args: {
    variant: "error",
    title: "Payment failed",
    children: "Please check your card details and try again.",
  },
};

export const TitleOnly: Story = {
  args: { variant: "info", title: "Info message without body." },
};

export const Dismissible: Story = {
  args: {
    variant: "success",
    title: "Saved",
    children: "Your changes have been saved.",
    dismissible: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /dismiss/i });
    expect(canvas.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(btn);
    expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};
