"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTenantConfig } from "@/context/TenantConfigContext";

/**
 * Shows the signed-in member's point balance (from the point-managements Custom
 * API) in the header. Renders nothing when signed out or when the member has no
 * balance.
 */
export function HeaderPoints() {
  const { credentials, isAuthenticated } = useAuth();
  const { pointManagementEnabled } = useTenantConfig();
  const accountMemberId = credentials?.accountMemberId;
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    // Feature off → no state, no API call.
    if (!pointManagementEnabled || !isAuthenticated || !accountMemberId) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/point-management?accountMemberId=${encodeURIComponent(accountMemberId)}`,
    )
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const b = j?.data?.balance;
        setBalance(typeof b === "number" ? b : null);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
    // Re-fetch when the account changes (balance is per account member).
  }, [pointManagementEnabled, isAuthenticated, accountMemberId, credentials?.selected]);

  if (balance == null) return null;

  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-3 py-1.5 text-sm font-semibold text-brand-primary"
      title="Point balance"
    >
      <Coins size={15} />
      {balance.toLocaleString()}
    </span>
  );
}
