import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: { size: "md" },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
        <div key={s} className="flex flex-col items-center gap-2">
          <Spinner size={s} />
          <span className="text-xs text-gray-500">{s}</span>
        </div>
      ))}
    </div>
  ),
};

export const CustomLabel: Story = {
  args: { size: "lg", label: "Processing payment…" },
};

export const InlineWithText: Story = {
  render: () => (
    <button
      disabled
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium opacity-70"
    >
      <Spinner size="sm" className="text-white" />
      Adding to cart…
    </button>
  ),
};
