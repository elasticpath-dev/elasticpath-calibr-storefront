import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { Pagination } from "./Pagination";

const meta: Meta<typeof Pagination> = {
  title: "UI/Pagination",
  component: Pagination,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

function PaginationDemo({ total, initial = 1 }: { total: number; initial?: number }) {
  const [page, setPage] = useState(initial);
  return (
    <div className="flex flex-col items-center gap-3">
      <Pagination currentPage={page} totalPages={total} onPageChange={setPage} />
      <p className="text-sm text-gray-500">Page {page} of {total}</p>
    </div>
  );
}

export const FewPages: Story = {
  render: () => <PaginationDemo total={5} />,
};

export const ManyPages: Story = {
  render: () => <PaginationDemo total={20} initial={10} />,
};

export const FirstPage: Story = {
  render: () => <PaginationDemo total={10} initial={1} />,
};

export const LastPage: Story = {
  render: () => <PaginationDemo total={10} initial={10} />,
};

export const NavigateForward: Story = {
  name: "Navigate forward interaction",
  render: () => <PaginationDemo total={5} initial={2} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /next page/i }));
    expect(canvas.getByText("Page 3 of 5")).toBeInTheDocument();
  },
};
