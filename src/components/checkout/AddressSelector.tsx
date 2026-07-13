"use client";

import { Check, PlusCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";
import { DeliveryAddress } from "./shipping/DeliveryAddress";

type Props = {
  addresses: AccountAddressResponse[];
  selectedId: string | null;
  onSelect: (address: AccountAddressResponse) => void;
  onUseNew: () => void;
};

export function AddressSelector({
  addresses,
  selectedId,
  onSelect,
  onUseNew,
}: Props) {
  const t = useTranslations("checkout");
  return (
    <div className="space-y-2">
      {addresses.map((addr) => {
        const isSelected = selectedId === addr.id;

        return (
          <button
            key={addr.id}
            type="button"
            onClick={() => onSelect(addr)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors flex items-start gap-3 ${
              isSelected
                ? "border-brand-primary bg-brand-primary/5"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex-1 min-w-0">
              <DeliveryAddress address={addr} />
            </div>
            {isSelected && (
              <Check size={16} className="text-brand-primary shrink-0 mt-0.5" />
            )}
          </button>
        );
      })}

      {/* Enter new address option */}
      <button
        type="button"
        onClick={onUseNew}
        className={`w-full text-left px-4 py-3 rounded-xl border-2 border-dashed transition-colors flex items-center gap-3 ${
          selectedId === null
            ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
            : "border-gray-200 hover:border-gray-300 text-gray-500"
        }`}
      >
        <PlusCircle size={16} className="shrink-0" />
        <span className="text-sm font-medium">{t("enterNewAddress")}</span>
        {selectedId === null && (
          <Check size={16} className="text-brand-primary ml-auto shrink-0" />
        )}
      </button>
    </div>
  );
}
