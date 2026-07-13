import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { LoginForm } from "./LoginForm";

const meta: Meta<typeof LoginForm> = {
  title: "Auth/LoginForm",
  component: LoginForm,
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
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: null,
    onForgotPassword: fn(),
    onSignUp: fn(),
  },
};

export const Loading: Story = {
  args: {
    onSubmit: fn(),
    isLoading: true,
    error: null,
    onForgotPassword: fn(),
    onSignUp: fn(),
  },
};

export const WithError: Story = {
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: "Invalid email or password. Please try again.",
    onForgotPassword: fn(),
    onSignUp: fn(),
  },
};
