/**
 * Point Management — a manager-only account area for maintaining per-member
 * point balances, stored in the `point-managements` Custom API (one entry per
 * account member; the entry id is the account_member_id, so writes upsert by
 * PUT /v2/extensions/point-managements/{account_member_id}).
 *
 * Access is gated by the account member's `role` flow field: members whose role
 * equals POINT_MANAGER_ROLE see the Point Management menu and page.
 */

export const POINT_MANAGEMENT_SLUG = "point-managements";

// The role value that grants access. NEXT_PUBLIC so the client can gate menus;
// defaults to "Manager".
export const POINT_MANAGER_ROLE = (
  process.env.NEXT_PUBLIC_POINT_MANAGER_ROLE || "Manager"
).trim();

export function isPointManager(role?: string | null): boolean {
  return (
    !!role && role.trim().toLowerCase() === POINT_MANAGER_ROLE.toLowerCase()
  );
}

export type PointRecord = {
  account_member_id: string;
  account_id: string;
  balance?: number;
  expiry_date?: string;
  auto_renew?: boolean;
  renew_points?: number;
};

export type AccountMemberSummary = {
  id: string;
  name: string;
  email: string;
  role?: string;
};
