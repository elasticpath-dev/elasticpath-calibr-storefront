import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Search, Mail, Eye } from "lucide-react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Enter text…" },
};

export const WithLabel: Story = {
  args: {
    label: "Email Address",
    type: "email",
    placeholder: "you@example.com",
    required: true,
  },
};

export const WithHint: Story = {
  args: {
    label: "Username",
    placeholder: "johnsmith",
    hint: "Must be 3–20 characters, letters and numbers only.",
  },
};

export const WithError: Story = {
  args: {
    label: "Password",
    type: "password",
    defaultValue: "abc",
    error: "Password must be at least 8 characters.",
  },
};

export const WithLeftAddon: Story = {
  args: {
    label: "Search",
    placeholder: "Search products…",
    leftAddon: <Search size={16} />,
  },
};

export const WithRightAddon: Story = {
  args: {
    label: "Password",
    type: "password",
    placeholder: "Enter password",
    rightAddon: <Eye size={16} />,
  },
};

export const Disabled: Story = {
  args: {
    label: "Read-only field",
    defaultValue: "Cannot edit",
    disabled: true,
  },
};

export const TypeInteraction: Story = {
  args: { label: "First Name", placeholder: "Enter your name" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");
    await userEvent.type(input, "Prashant");
    expect(input).toHaveValue("Prashant");
  },
};
