import { NextRequest, NextResponse } from "next/server";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

// Booking reference apply — the /v2/booking endpoint isn't part of the SDK, so
// it's called directly via the hey-api client (same approach as quotes.ts).
const BEARER = [{ scheme: "bearer", type: "http" }] as const;

/**
 * Applies a booking reference by POSTing it to Elastic Path's
 * /v2/{cartId}/booking endpoint, which returns the updated cart. Body:
 * { bookingRef: string, cartId: string }. Adjust the outbound body shape below
 * to match the booking API's actual contract.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    bookingRef?: unknown;
    cartId?: unknown;
  } | null;
  const bookingRef =
    typeof body?.bookingRef === "string" ? body.bookingRef.trim() : "";
  const cartId = typeof body?.cartId === "string" ? body.cartId.trim() : "";

  if (!bookingRef) {
    return NextResponse.json({ error: "Missing bookingRef" }, { status: 400 });
  }
  if (!cartId) {
    return NextResponse.json({ error: "Missing cartId" }, { status: 400 });
  }

  try {
    const client = await createElasticPathClient();
    // cartId in the path (/v2/{cartId}/booking); returns the updated cart.
    const res = await client.post({
      url: "/v2/{cartId}/booking",
      path: { cartId },
      security: BEARER,
      headers: { "Content-Type": "application/json" },
      body: {
        data: {
          type: "booking",
          booking_ref: bookingRef,
        },
      },
    });

    if (res.error) {
      const err = res.error as { errors?: Array<{ detail?: string; title?: string }> };
      const detail =
        err?.errors?.[0]?.detail ??
        err?.errors?.[0]?.title ??
        "Booking reference could not be applied";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    // The endpoint returns the updated cart — hand it back so the client can
    // refresh the cart view.
    return NextResponse.json({ data: res.data ?? null });
  } catch (err) {
    console.error("Booking apply error:", err);
    return NextResponse.json(
      { error: "Failed to apply booking reference" },
      { status: 500 },
    );
  }
}
