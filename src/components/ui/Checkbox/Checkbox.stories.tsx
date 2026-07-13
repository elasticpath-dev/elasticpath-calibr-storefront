import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: { label: "Accept terms and conditions" },
};

export const WithDescription: Story = {
  args: {
    label: "Marketing emails",
    description: "Receive product updates and promotional offers.",
  },
};

export const Checked: Story = {
  args: { label: "Remember me", defaultChecked: true },
};

export const WithError: Story = {
  args: {
    label: "I agree to the terms",
    error: "You must accept the terms to continue.",
  },
};

export const Disabled: Story = {
  args: { label: "Unavailable option", disabled: true },
};

export const IndeterminateVisual: Story = {
  name: "Indeterminate (visual)",
  args: { label: "Select all", indeterminate: true, defaultChecked: true },
};

export const ToggleInteraction: Story = {
  name: "Toggle interaction",
  args: { label: "Agree to terms" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  },
};
