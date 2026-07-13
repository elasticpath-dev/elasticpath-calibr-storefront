import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Tooltip } from "./Tooltip";
import { Button } from "@/components/ui/Button";

const meta: Meta<typeof Tooltip> = {
  title: "UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="p-16 flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Top: Story = {
  render: () => (
    <Tooltip content="Tooltip on top" placement="top">
      <Button variant="outline" size="sm">Hover me</Button>
    </Tooltip>
  ),
};

export const Bottom: Story = {
  render: () => (
    <Tooltip content="Tooltip below" placement="bottom">
      <Button variant="outline" size="sm">Hover me</Button>
    </Tooltip>
  ),
};

export const Left: Story = {
  render: () => (
    <Tooltip content="Tooltip on left" placement="left">
      <Button variant="outline" size="sm">Hover me</Button>
    </Tooltip>
  ),
};

export const Right: Story = {
  render: () => (
    <Tooltip content="Tooltip on right" placement="right">
      <Button variant="outline" size="sm">Hover me</Button>
    </Tooltip>
  ),
};

export const WithRichContent: Story = {
  render: () => (
    <Tooltip
      content={<span><strong>Cmd+K</strong> to open search</span>}
      placement="top"
    >
      <Button variant="ghost" size="sm">Keyboard shortcut</Button>
    </Tooltip>
  ),
};

export const ShowOnHover: Story = {
  name: "Show on hover interaction",
  render: () => (
    <Tooltip content="I appear on hover" placement="top">
      <button className="px-3 py-1.5 rounded border text-sm">Hover target</button>
    </Tooltip>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /hover target/i });
    expect(canvas.queryByRole("tooltip")).not.toBeInTheDocument();
    await userEvent.hover(trigger);
    expect(canvas.getByRole("tooltip")).toBeInTheDocument();
    await userEvent.unhover(trigger);
    expect(canvas.queryByRole("tooltip")).not.toBeInTheDocument();
  },
};
