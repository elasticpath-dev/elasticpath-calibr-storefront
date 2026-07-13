import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from "./Card";
import { Button } from "@/components/ui/Button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>Review your items before checkout.</CardDescription>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-gray-600">2 items · Free shipping</p>
      </CardBody>
      <CardFooter>
        <Button size="sm" className="ml-auto">Checkout</Button>
      </CardFooter>
    </Card>
  ),
};

export const Bordered: Story = {
  render: () => (
    <Card variant="bordered" className="w-80">
      <CardBody>
        <p className="text-sm text-gray-700">Bordered card variant.</p>
      </CardBody>
    </Card>
  ),
};

export const Elevated: Story = {
  render: () => (
    <Card variant="elevated" className="w-80">
      <CardBody>
        <p className="text-sm text-gray-700">Elevated card with shadow.</p>
      </CardBody>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Saved Addresses</CardTitle>
        <CardDescription>Manage your delivery locations.</CardDescription>
      </CardHeader>
    </Card>
  ),
};

export const BodyOnly: Story = {
  render: () => (
    <Card className="w-72">
      <CardBody>
        <p className="text-sm text-gray-600">A minimal card with body content only.</p>
      </CardBody>
    </Card>
  ),
};
