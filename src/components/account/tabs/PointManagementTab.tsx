"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Coins } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTenantConfig } from "@/context/TenantConfigContext";
import {
  isPointManager,
  type AccountMemberSummary,
  type PointRecord,
} from "@/lib/point-management";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Modal } from "@/components/ui/Modal";

export function PointManagementTab({ lang }: { lang: string }) {
  const t = useTranslations("pointManagement");
  const { credentials, selectedAccount, isLoading } = useAuth();
  const { pointManagementEnabled } = useTenantConfig();
  const router = useRouter();

  const accountId = selectedAccount?.account_id ?? credentials?.selected ?? "";
  const canManage =
    pointManagementEnabled && isPointManager(credentials?.member_role);

  const [members, setMembers] = useState<AccountMemberSummary[]>([]);
  const [records, setRecords] = useState<Record<string, PointRecord>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AccountMemberSummary | null>(null);

  // Non-managers shouldn't be here.
  useEffect(() => {
    if (!isLoading && credentials && !canManage) {
      router.replace(`/${lang}/account`);
    }
  }, [isLoading, credentials, canManage, lang, router]);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const [mRes, pRes] = await Promise.all([
      fetch(`/api/account/members?accountId=${encodeURIComponent(accountId)}`)
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
      fetch(`/api/point-management?accountId=${encodeURIComponent(accountId)}`)
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ]);
    setMembers((mRes.data ?? []) as AccountMemberSummary[]);
    const map: Record<string, PointRecord> = {};
    for (const rec of (pRes.data ?? []) as PointRecord[]) {
      map[rec.account_member_id] = rec;
    }
    setRecords(map);
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  if (isLoading || !canManage) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <Coins size={20} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t("title")}</h2>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        </div>
      ) : members.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">
          {t("noMembers")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2 pr-4 font-medium">{t("member")}</th>
                <th className="py-2 pr-4 font-medium">{t("balance")}</th>
                <th className="py-2 pr-4 font-medium">{t("expiry")}</th>
                <th className="py-2 pr-4 font-medium">{t("autoRenew")}</th>
                <th className="py-2 pr-4 font-medium">{t("renewPoints")}</th>
                <th className="py-2 pl-4 font-medium text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const rec = records[m.id];
                return (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900">
                        {m.name || m.email || m.id}
                      </div>
                      {m.name && m.email && (
                        <div className="text-xs text-gray-400">{m.email}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {rec?.balance ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {rec?.expiry_date ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {rec ? (rec.auto_renew ? t("yes") : t("no")) : "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {rec?.renew_points ?? "—"}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(m)}
                      >
                        {rec ? t("edit") : t("setUp")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PointEditorModal
          member={editing}
          accountId={accountId}
          initial={records[editing.id]}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function PointEditorModal({
  member,
  accountId,
  initial,
  onClose,
  onSaved,
}: {
  member: AccountMemberSummary;
  accountId: string;
  initial?: PointRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("pointManagement");
  const [balance, setBalance] = useState(initial?.balance?.toString() ?? "");
  const [expiry, setExpiry] = useState(initial?.expiry_date ?? "");
  const [autoRenew, setAutoRenew] = useState(Boolean(initial?.auto_renew));
  const [renewPoints, setRenewPoints] = useState(
    initial?.renew_points?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/point-management", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_member_id: member.id,
          account_id: accountId,
          balance: balance === "" ? undefined : Number(balance),
          renew_points: renewPoints === "" ? undefined : Number(renewPoints),
          auto_renew: autoRenew,
          expiry_date: expiry || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? t("saveError"));
        return;
      }
      onSaved();
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t("editTitle")} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{member.name || member.email}</p>
        <Input
          label={t("balance")}
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
        <Input
          label={t("expiry")}
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />
        <Input
          label={t("renewPoints")}
          type="number"
          value={renewPoints}
          onChange={(e) => setRenewPoints(e.target.value)}
        />
        <Checkbox
          label={t("autoRenew")}
          checked={autoRenew}
          onChange={(e) => setAutoRenew(e.target.checked)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            {t("save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
