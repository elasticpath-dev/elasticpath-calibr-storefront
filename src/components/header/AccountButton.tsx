"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  User,
  LogOut,
  ChevronDown,
  Check,
  Building2,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  RefreshCw,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";

export function AccountButton() {
  const t = useTranslations("header");
  const tAccount = useTranslations("account");
  const {
    credentials,
    selectedAccount,
    isAuthenticated,
    selectAccount,
    logout,
  } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "en";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label={t("signIn")}
        >
          <User size={18} />
          <span className="hidden sm:inline">{t("signIn")}</span>
        </button>
        <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  const memberName = credentials?.member_name;
  const accountName = selectedAccount?.account_name ?? t("myAccount");
  const initials = (memberName || accountName)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const accountList = credentials ? Object.values(credentials.accounts) : [];
  const hasMultipleAccounts = accountList.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
        <span className="w-7 h-7 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center justify-center shrink-0">
          {initials}
        </span>
        <span className="hidden sm:flex sm:flex-col sm:items-start sm:max-w-[140px]">
          {memberName && (
            <span className="text-xs font-medium leading-tight truncate w-full text-left">
              {memberName}
            </span>
          )}
          {(hasMultipleAccounts || !memberName) && (
            <span
              className={`leading-tight truncate w-full text-left ${memberName ? "text-[11px] text-gray-500" : "text-sm"}`}
            >
              {accountName}
            </span>
          )}
        </span>
        <ChevronDown size={14} className="hidden sm:block text-gray-400" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {/* Email + account name when it differs from member name */}
          {(credentials?.member_email ||
            (selectedAccount?.account_name &&
              memberName !== selectedAccount.account_name)) && (
            <div className="px-3 py-2 border-b border-gray-100">
              {credentials?.member_email && (
                <p className="text-xs text-gray-400 truncate">
                  {credentials.member_email}
                </p>
              )}
              {selectedAccount?.account_name &&
                memberName !== selectedAccount.account_name && (
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                    <Building2 size={11} className="shrink-0" />
                    {selectedAccount.account_name}
                  </p>
                )}
            </div>
          )}

          {/* Account switcher — only shown when member belongs to multiple accounts */}
          {hasMultipleAccounts && (
            <div className="border-b border-gray-100 py-1">
              <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {tAccount("switchAccount")}
              </p>
              {accountList.map((account) => {
                const isActive = account.account_id === credentials?.selected;
                return (
                  <button
                    key={account.account_id}
                    type="button"
                    onClick={() => {
                      selectAccount(account.account_id);
                      setShowDropdown(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "text-brand-primary bg-brand-primary/5"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Building2 size={14} className="shrink-0" />
                    <span className="flex-1 text-left truncate">
                      {account.account_name}
                    </span>
                    {isActive && (
                      <Check
                        size={14}
                        className="shrink-0 text-brand-primary"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="py-1">
            <Link
              href={`/${lang}/account/personal`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User size={15} />
              {t("myAccount")}
            </Link>
            <Link
              href={`/${lang}/account/addresses`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <MapPin size={15} />
              {tAccount("tabAddresses")}
            </Link>
            <Link
              href={`/${lang}/account/carts`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ShoppingCart size={15} />
              {tAccount("tabCarts")}
            </Link>
            <Link
              href={`/${lang}/account/orders`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ShoppingBag size={15} />
              {tAccount("tabOrders")}
            </Link>
            <Link
              href={`/${lang}/account/subscriptions`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={15} />
              {tAccount("tabSubscriptions")}
            </Link>
            <Link
              href={`/${lang}/account/quotes`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileText size={15} />
              {tAccount("tabQuotes")}
            </Link>
          </div>
          <div className="border-t border-gray-100" />
          <button
            type="button"
            onClick={() => {
              logout();
              setShowDropdown(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
