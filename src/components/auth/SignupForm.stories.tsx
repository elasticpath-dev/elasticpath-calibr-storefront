import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SignupForm } from "./SignupForm";

const meta: Meta<typeof SignupForm> = {
  title: "Auth/SignupForm",
  component: SignupForm,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SignupForm>;

export const Default: Story = {
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: null,
    onSignIn: fn(),
  },
};

export const Loading: Story = {
  args: {
    onSubmit: fn(),
    isLoading: true,
    error: null,
    onSignIn: fn(),
  },
};

export const WithError: Story = {
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: "An account with this email address already exists.",
    onSignIn: fn(),
  },
};
