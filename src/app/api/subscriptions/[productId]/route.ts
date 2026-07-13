import { NextRequest, NextResponse } from "next/server";
import { getProductOffering } from "@/lib/api/subscriptions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  if (!productId)
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  const offering = await getProductOffering(productId);
  return NextResponse.json(offering);
}
