import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarGroup } from "./Avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  args: {
    src: "https://i.pravatar.cc/150?img=3",
    alt: "Jane Doe",
    size: "md",
  },
};

export const Initials: Story = {
  args: { fallback: "John Smith", size: "md" },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
        <Avatar key={s} fallback="Alice Brown" size={s} />
      ))}
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <AvatarGroup
      avatars={[
        { fallback: "Alice Brown" },
        { fallback: "Bob Carter" },
        { fallback: "Carol Davis" },
        { fallback: "Dan Evans" },
        { fallback: "Eve Foster" },
        { fallback: "Frank Green" },
      ]}
      size="md"
      max={4}
    />
  ),
};

export const GroupSingleLine: Story = {
  name: "Group (no overflow)",
  render: () => (
    <AvatarGroup
      avatars={[{ fallback: "Alice Brown" }, { fallback: "Bob Carter" }]}
      size="sm"
    />
  ),
};
