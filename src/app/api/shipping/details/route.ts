import { NextResponse } from "next/server";

// Shipping methods available for selection when creating a shipment.
// Matches the Standard / Expedited / Overnight options shown in the design.
const METHODS = {
  standard: {
    shipping_method: "Standard Shipping",
    shipping_cost: 0,
    currency: "USD",
    shipping_message: "Free on all orders",
    delivery_estimate: { start: "5", end: "7", unit: "days" },
    sort_order: 1,
  },
  expedited: {
    shipping_method: "Expedited",
    shipping_cost: 2499,
    currency: "USD",
    shipping_message: "Faster delivery",
    delivery_estimate: { start: "2", end: "3", unit: "days" },
    sort_order: 2,
  },
  overnight: {
    shipping_method: "Overnight",
    shipping_cost: 4999,
    currency: "USD",
    shipping_message: "Next business day",
    delivery_estimate: { start: "1", end: "1", unit: "day" },
    sort_order: 3,
  },
};

export async function POST() {
  return NextResponse.json({ data: METHODS });
}
