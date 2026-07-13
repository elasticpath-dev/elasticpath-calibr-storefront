import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { CheckoutForm } from "./CheckoutForm";

const meta: Meta<typeof CheckoutForm> = {
  title: "Checkout/CheckoutForm",
  component: CheckoutForm,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CheckoutForm>;

export const Default: Story = {
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: null,
  },
};

export const Loading: Story = {
  args: {
    onSubmit: fn(),
    isLoading: true,
    error: null,
  },
};

export const WithError: Story = {
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: "Payment declined. Please check your details and try again.",
  },
};
