import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { RangeSlider, type RangeSliderValue } from "./RangeSlider";

const meta: Meta<typeof RangeSlider> = {
  title: "UI/RangeSlider",
  component: RangeSlider,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RangeSlider>;

function Controlled(props: Partial<React.ComponentProps<typeof RangeSlider>>) {
  const [value, setValue] = useState<RangeSliderValue>(props.value ?? [20, 80]);
  const [committed, setCommitted] = useState<RangeSliderValue>(value);
  return (
    <div className="w-72 space-y-3">
      <RangeSlider
        min={0}
        max={100}
        {...props}
        value={value}
        onChange={setValue}
        onCommit={setCommitted}
      />
      <p className="text-sm text-gray-600" data-testid="value">
        {value[0]} – {value[1]}
      </p>
      <p className="text-xs text-gray-400" data-testid="committed">
        committed: {committed[0]} – {committed[1]}
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};

export const WithCurrencyFormat: Story = {
  render: () => (
    <Controlled
      min={0}
      max={500}
      value={[50, 320]}
      minLabel="Minimum price"
      maxLabel="Maximum price"
      formatValue={(v) => `$${v}`}
    />
  ),
};

export const Disabled: Story = {
  render: () => <Controlled disabled />,
};

export const KeyboardInteraction: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const minThumb = canvas.getByLabelText("Minimum");
    minThumb.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await expect(canvas.getByTestId("value")).toHaveTextContent("22 – 80");
    await expect(canvas.getByTestId("committed")).toHaveTextContent("committed: 22 – 80");
  },
};

export const ThumbsCannotCross: Story = {
  render: () => <Controlled value={[79, 80]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const minThumb = canvas.getByLabelText("Minimum");
    minThumb.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    await expect(canvas.getByTestId("value")).toHaveTextContent("80 – 80");
  },
};
