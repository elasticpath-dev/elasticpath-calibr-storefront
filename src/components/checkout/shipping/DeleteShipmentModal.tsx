"use client";

import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { CartItem } from "./types";

type Props = {
  shipmentName: string;
  members: CartItem[];
  onConfirm: () => void;
  onClose: () => void;
};

export function DeleteShipmentModal({ shipmentName, members, onConfirm, onClose }: Props) {
  const t = useTranslations("shipping");
  const units = members.reduce((s, i) => s + (i.quantity ?? 0), 0);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title={shipmentName}
      description={
        members.length === 0
          ? t("emptyShipment")
          : t("linesAndUnits", { lines: members.length, units })
      }
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            {t("delete")}
          </Button>
        </>
      }
    >
      <p className="text-xs text-gray-500">{t("deleteWarning")}</p>
      {members.length > 0 && (
        <div className="mt-4 space-y-2.5 max-h-48 overflow-y-auto">
          {members.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Package size={13} className="text-gray-300" />
              </div>
              <p className="flex-1 text-sm text-gray-800 truncate">{item.name}</p>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {t("qty", { qty: item.quantity ?? 0 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
