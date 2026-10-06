import { NextRequest, NextResponse } from "next/server";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";
import type { AccountMemberSummary } from "@/lib/point-management";

// Account memberships / members aren't in the SDK surface we use here, so call
// them directly via the hey-api client (same pattern as vehicle-finder/quotes).
const BEARER = [{ scheme: "bearer", type: "http" }] as const;
const ROLE_FIELD = process.env.ACCOUNT_MEMBER_ROLE_FIELD || "role";

/**
 * Lists the account members belonging to an account (id, name, email, role).
 * Resolves the account's memberships, then each member's details. Used by the
 * Point Management page to show every member in the account.
 */
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId")?.trim();
  if (!accountId) return NextResponse.json({ data: [] });

  try {
    const client = await createElasticPathClient();

    // Include the account_member resources so we get every member's name/email
    // in one call — a member-scoped token can't read other members individually.
    const memRes = await client.get({
      url: "/v2/accounts/{accountId}/account-memberships",
      path: { accountId },
      security: BEARER,
      query: { "page[limit]": 100, include: "account_member" },
    });

    const payload = memRes.data as {
      data?: Array<Record<string, unknown>>;
      included?:
        | Array<Record<string, unknown>>
        | { account_members?: Array<Record<string, unknown>> };
    };
    const memberships = payload?.data ?? [];

    const toSummary = (d: Record<string, unknown>): AccountMemberSummary => ({
      id: String(d.id ?? ""),
      name: (d.name as string) ?? "",
      email: (d.email as string) ?? "",
      role: typeof d[ROLE_FIELD] === "string" ? (d[ROLE_FIELD] as string) : undefined,
    });

    // Preferred: build from the included account_member resources.
    const includedRaw = payload?.included;
    const included = Array.isArray(includedRaw)
      ? includedRaw
      : (includedRaw?.account_members ?? []);

    let members: AccountMemberSummary[];
    if (included.length > 0) {
      members = included.map(toSummary).filter((m) => m.id);
    } else {
      // Fallback: resolve member ids from memberships, then fetch each.
      const ids = [
        ...new Set(
          memberships
            .map((m) => {
              const rel = (m.relationships as Record<string, unknown>)
                ?.account_member as { data?: { id?: string } } | undefined;
              return (m.account_member_id as string) ?? rel?.data?.id ?? undefined;
            })
            .filter((id): id is string => !!id),
        ),
      ];
      members = await Promise.all(
        ids.map(async (id): Promise<AccountMemberSummary> => {
          try {
            const r = await client.get({
              url: "/v2/account-members/{id}",
              path: { id },
              security: BEARER,
            });
            const d = (r.data as { data?: Record<string, unknown> })?.data;
            return d ? { ...toSummary(d), id } : { id, name: "", email: "" };
          } catch {
            return { id, name: "", email: "" };
          }
        }),
      );
    }

    members.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    return NextResponse.json({ data: members });
  } catch (err) {
    console.error("Account members fetch error:", err);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}
