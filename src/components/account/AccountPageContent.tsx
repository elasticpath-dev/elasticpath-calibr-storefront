"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  User,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  FileText,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type Tab =
  | "personal"
  | "addresses"
  | "orders"
  | "carts"
  | "quotes"
  | "subscriptions";

type Props = { lang: string; children: React.ReactNode };

export function AccountPageContent({ lang, children }: Props) {
  const t = useTranslations("account");
  const { credentials, selectedAccount, isAuthenticated, isLoading, logout } =
    useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${lang}`);
    }
  }, [isLoading, isAuthenticated, router, lang]);

  if (isLoading) return null;
  if (!selectedAccount || !credentials) return null;

  const name = selectedAccount.account_name;
  const initialsSource = credentials.member_name || name;
  const initials = initialsSource
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const TABS: Array<{ key: Tab; icon: React.ReactNode; label: string }> = [
    { key: "personal", icon: <User size={15} />, label: t("tabPersonal") },
    { key: "addresses", icon: <MapPin size={15} />, label: t("tabAddresses") },
    { key: "orders", icon: <ShoppingBag size={15} />, label: t("tabOrders") },
    { key: "carts", icon: <ShoppingCart size={15} />, label: t("tabCarts") },
    { key: "quotes", icon: <FileText size={15} />, label: t("tabQuotes") },
    {
      key: "subscriptions",
      icon: <RefreshCw size={15} />,
      label: t("tabSubscriptions"),
    },
  ];

  return (
    <div className="container-shell px-4 sm:px-6 lg:px-8 py-10">
      {/* Page heading */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <aside className="flex-none w-56 sticky top-6">
          {/* Profile card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white text-sm font-bold flex items-center justify-center shrink-0 select-none">
                {initials}
              </div>
              <div className="min-w-0">
                {credentials.member_name && (
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {credentials.member_name}
                  </p>
                )}
                <p
                  className={
                    credentials.member_name
                      ? "text-xs text-gray-400 truncate"
                      : "text-sm font-semibold text-gray-900 truncate"
                  }
                >
                  {name}
                </p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav
            className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
            aria-label="Account sections"
          >
            {TABS.map(({ key, icon, label }) => {
              const active = pathname.includes(`/account/${key}`);
              return (
                <Link
                  key={key}
                  href={`/${lang}/account/${key}`}
                  className={[
                    "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors border-l-2",
                    active
                      ? "bg-brand-primary/10 text-brand-primary border-brand-primary"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent",
                  ].join(" ")}
                >
                  <span
                    className={active ? "text-brand-primary" : "text-gray-400"}
                  >
                    {icon}
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
