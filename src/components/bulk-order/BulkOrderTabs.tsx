"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BulkOrder } from "./BulkOrder";
import { QuickOrder } from "./QuickOrder";

type Tab = "bulk" | "quick";

export function BulkOrderTabs() {
  const t = useTranslations("bulkOrder");
  const [tab, setTab] = useState<Tab>("bulk");

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "bulk", label: t("bulkOrderTab") },
    { key: "quick", label: t("quickOrderTab") },
  ];

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-2" aria-label="Bulk order tabs">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? "page" : undefined}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-brand-primary text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "bulk" ? <BulkOrder /> : <QuickOrder />}
    </div>
  );
}
