import { NextRequest, NextResponse } from "next/server";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import {
  POINT_MANAGEMENT_SLUG,
  type PointRecord,
} from "@/lib/point-management";

// Custom API entries are called directly via the hey-api client.
const BEARER = [{ scheme: "bearer", type: "http" }] as const;

// The Custom API's api_type (entry `type`). Override via env if yours differs.
const API_TYPE =
  process.env.POINT_MANAGEMENT_API_TYPE || "point_management_ext";

/** List point records for an account (one per member). */
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId")?.trim();
  if (!accountId) return NextResponse.json({ data: [] });

  try {
    const client = await createElasticPathClient();
    const res = await client.get({
      url: `/v2/extensions/${POINT_MANAGEMENT_SLUG}`,
      security: BEARER,
      query: { filter: `eq(account_id,${accountId})`, "page[limit]": 100 },
    });

    if (res.error) {
      return NextResponse.json({ data: [] });
    }

    // Custom API entries expose their fields at the top level of each entry.
    const records = (
      (res.data as { data?: Array<Record<string, unknown>> })?.data ?? []
    ).map((r) => ({
      account_member_id: String(r.account_member_id ?? r.id ?? ""),
      account_id: String(r.account_id ?? ""),
      balance: r.balance as number | undefined,
      expiry_date: r.expiry_date as string | undefined,
      auto_renew: r.auto_renew as boolean | undefined,
      renew_points: r.renew_points as number | undefined,
    }));

    return NextResponse.json({ data: records });
  } catch (err) {
    console.error("Point management list error:", err);
    return NextResponse.json(
      { error: "Failed to load points" },
      { status: 500 },
    );
  }
}

/**
 * Upsert a member's point record. The entry id is the account_member_id, so a
 * PUT to /v2/extensions/{slug}/{account_member_id} creates it when absent or
 * updates it when present (the Custom API must have allow_upserts enabled).
 */
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<PointRecord>;
  const accountMemberId = String(body.account_member_id ?? "").trim();
  const accountId = String(body.account_id ?? "").trim();

  if (!accountMemberId || !accountId) {
    return NextResponse.json(
      { error: "account_member_id and account_id are required" },
      { status: 400 },
    );
  }

  // Only the known fields, coerced to their types.
  const attributes: Record<string, unknown> = {
    account_member_id: accountMemberId,
    account_id: accountId,
  };
  if (body.balance != null) attributes.balance = Number(body.balance);
  if (body.renew_points != null)
    attributes.renew_points = Number(body.renew_points);
  if (body.auto_renew != null) attributes.auto_renew = Boolean(body.auto_renew);
  if (body.expiry_date) attributes.expiry_date = String(body.expiry_date);

  try {
    const client = await createElasticPathClient();
    const res = await client.put({
      url: `/v2/extensions/${POINT_MANAGEMENT_SLUG}/{entryId}`,
      path: { entryId: accountMemberId },
      security: BEARER,
      headers: { "Content-Type": "application/json" },
      body: { data: { type: API_TYPE, id: accountMemberId, ...attributes } },
    });

    if (res.error) {
      const err = res.error as {
        errors?: Array<{ detail?: string; title?: string }>;
      };
      const detail =
        err?.errors?.[0]?.detail ??
        err?.errors?.[0]?.title ??
        "Failed to save points";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    return NextResponse.json({ data: res.data ?? null });
  } catch (err) {
    console.error("Point management upsert error:", err);
    return NextResponse.json(
      { error: "Failed to save points" },
      { status: 500 },
    );
  }
}
