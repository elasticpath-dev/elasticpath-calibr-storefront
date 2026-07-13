import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./Header";

const meta: Meta<typeof Header> = {
  title: "Components/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Header>;

export const English: Story = {
  args: { lang: "en" },
};

export const French: Story = {
  args: { lang: "fr" },
};

export const Spanish: Story = {
  args: { lang: "es" },
};
