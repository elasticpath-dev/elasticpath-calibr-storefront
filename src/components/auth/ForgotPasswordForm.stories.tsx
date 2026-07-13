import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

const meta: Meta<typeof ForgotPasswordForm> = {
  title: "Auth/ForgotPasswordForm",
  component: ForgotPasswordForm,
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
type Story = StoryObj<typeof ForgotPasswordForm>;

export const Default: Story = {
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: null,
    onBackToSignIn: fn(),
  },
};

export const Loading: Story = {
  args: {
    onSubmit: fn(),
    isLoading: true,
    error: null,
    onBackToSignIn: fn(),
  },
};
