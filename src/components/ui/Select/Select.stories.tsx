import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./Select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Select>;

const COUNTRY_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "fr", label: "France" },
  { value: "de", label: "Germany" },
];

export const Default: Story = {
  args: {
    label: "Country",
    options: COUNTRY_OPTIONS,
    placeholder: "Select a country…",
  },
};

export const WithHint: Story = {
  args: {
    label: "Shipping Region",
    options: COUNTRY_OPTIONS,
    hint: "Determines available shipping methods.",
  },
};

export const WithError: Story = {
  args: {
    label: "Category",
    options: COUNTRY_OPTIONS,
    error: "Please select a category.",
  },
};

export const Disabled: Story = {
  args: {
    label: "Currency",
    options: [{ value: "usd", label: "USD" }],
    defaultValue: "usd",
    disabled: true,
  },
};
