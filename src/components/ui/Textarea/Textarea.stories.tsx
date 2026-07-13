import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Textarea } from "./Textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: { label: "Message", placeholder: "Write your message…" },
};

export const WithHint: Story = {
  args: {
    label: "Bio",
    placeholder: "Tell us about yourself",
    hint: "Max 200 characters.",
  },
};

export const WithError: Story = {
  args: {
    label: "Notes",
    defaultValue: "x",
    error: "Too short — minimum 10 characters.",
  },
};

export const Disabled: Story = {
  args: { label: "Read-only", defaultValue: "Cannot be edited.", disabled: true },
};

export const TypeInteraction: Story = {
  name: "Type interaction",
  args: { label: "Bio", placeholder: "Tell us about yourself" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ta = canvas.getByRole("textbox");
    await userEvent.type(ta, "I love building storefronts.");
    expect(ta).toHaveValue("I love building storefronts.");
  },
};
