import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { RadioGroup } from "./RadioGroup";

const meta: Meta<typeof RadioGroup> = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

const SIZES = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
];

const SHIPPING = [
  { value: "standard", label: "Standard", description: "3–5 business days · Free" },
  { value: "express", label: "Express", description: "1–2 business days · $9.99" },
  { value: "same", label: "Same day", description: "Order by 12pm · $19.99", disabled: true },
];

export const Default: Story = {
  args: {
    name: "size",
    label: "Size",
    options: SIZES,
  },
};

export const WithDescriptions: Story = {
  args: {
    name: "shipping",
    label: "Shipping method",
    options: SHIPPING,
    value: "standard",
  },
};

export const Horizontal: Story = {
  args: {
    name: "size-h",
    label: "Size",
    options: SIZES,
    orientation: "horizontal",
  },
};

export const WithError: Story = {
  args: {
    name: "required",
    label: "Preferred contact",
    options: [{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }],
    error: "Please select an option.",
  },
};

export const SelectOption: Story = {
  name: "Select option interaction",
  render: () => {
    const [val, setVal] = useState("");
    return <RadioGroup name="demo" label="Favourite size" options={SIZES} value={val} onChange={setVal} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radio = canvas.getByRole("radio", { name: "M" });
    await userEvent.click(radio);
    expect(radio).toBeChecked();
  },
};
