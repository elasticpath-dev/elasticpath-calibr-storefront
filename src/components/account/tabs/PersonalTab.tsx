"use client";

import { User, Mail, Building2, Hash, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";

export function PersonalTab() {
  const t = useTranslations("account");
  const { credentials, selectedAccount, selectAccount } = useAuth();

  if (!credentials || !selectedAccount) return null;

  const accountList = Object.values(credentials.accounts);

  return (
    <div className="space-y-5 max-w-xl">
      {/* Personal details */}
      <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100 shadow-sm">
        <Row icon={<User size={15} />} label={t("memberName")} value={credentials.member_name || "—"} />
        <Row icon={<Mail size={15} />} label={t("memberEmail")} value={credentials.member_email || "—"} />
        <Row icon={<Building2 size={15} />} label={t("accountName")} value={selectedAccount.account_name} />
        <Row
          icon={<Hash size={15} />}
          label={t("accountId")}
          value={selectedAccount.account_id}
          mono
        />
      </div>

      {/* Account switcher — only shown when the member belongs to multiple accounts */}
      {accountList.length > 1 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t("accounts")}
          </p>
          <div className="divide-y divide-gray-100">
            {accountList.map((account) => {
              const isActive = account.account_id === credentials.selected;
              return (
                <button
                  key={account.account_id}
                  type="button"
                  onClick={() => !isActive && selectAccount(account.account_id)}
                  disabled={isActive}
                  className={`flex items-center gap-3 w-full px-5 py-3 text-left transition-colors ${
                    isActive ? "cursor-default" : "hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  <Building2
                    size={14}
                    className={`shrink-0 ${isActive ? "text-brand-primary" : "text-gray-400"}`}
                  />
                  <span
                    className={`text-sm flex-1 ${
                      isActive ? "font-medium text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {account.account_name}
                  </span>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-xs bg-brand-accent/20 text-brand-secondary px-2 py-0.5 rounded-full font-medium">
                      <Check size={10} />
                      {t("active")}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">{t("switchAccount")}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm text-gray-800 truncate ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
