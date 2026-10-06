import { NextRequest, NextResponse } from "next/server";
import { getV2AccountsAccountId } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

// The account's currency is stored in a flow (custom) field on the Accounts
// resource. Flow-field values come back as top-level properties on the account
// object. Override the field slug via ACCOUNT_CURRENCY_FIELD (default "currency").
const CURRENCY_FIELD = process.env.ACCOUNT_CURRENCY_FIELD || "currency";

/**
 * Returns the signed-in account's currency (from its flow field), or null when
 * unset. The client (CatalogContext) calls this on login/account change and
 * caches the result in the ep_account_currency cookie, which getServerCurrency
 * then prefers over the default.
 */
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId")?.trim();
  if (!accountId) return NextResponse.json({ currency: null });

  try {
    const client = await createElasticPathClient();
    const res = await getV2AccountsAccountId({
      client,
      path: { accountID: accountId },
    });
    const data = res.data?.data as Record<string, unknown> | undefined;
    const raw = data?.[CURRENCY_FIELD];
    const currency =
      typeof raw === "string" && raw.trim() ? raw.trim().toUpperCase() : null;
    return NextResponse.json({ currency });
  } catch (err) {
    console.error("Account currency fetch error:", err);
    return NextResponse.json({ currency: null });
  }
}
