"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CartItem } from "./types";

const DotGrip = () => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="currentColor" className="text-gray-300 flex-shrink-0 cursor-grab"
  >
    <circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/>
    <circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/>
    <circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>
  </svg>
);

type Props = {
  unassigned: CartItem[];
  dragItemId: string | null;
  unassignedMenuId: string | null;
  setUnassignedMenuId: (id: string | null) => void;
  onDragStart: (itemId: string) => void;
  onDragEnd: () => void;
  onRemoveSplit: (productId: string) => void;
};

export function UnassignedItems({
  unassigned, dragItemId, unassignedMenuId, setUnassignedMenuId,
  onDragStart, onDragEnd, onRemoveSplit,
}: Props) {
  const t = useTranslations("shipping");

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500">
          {t("unassignedCount", { count: unassigned.length })}
        </p>
      </div>
      <div className="p-3 space-y-2">
        {unassigned.map((item) => {
          const isSplit = !!item.custom_inputs?.["_ep_split_id"];
          const splitParts = isSplit
            ? unassigned.filter(
                (i) => i.product_id === item.product_id && i.custom_inputs?.["_ep_split_id"],
              )
            : [];
          const mergedQty = splitParts.reduce((s, i) => s + (i.quantity ?? 0), 0);

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", item.id ?? "");
                onDragStart(item.id ?? "");
              }}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-gray-50 cursor-grab hover:shadow-sm transition-all ${
                isSplit
                  ? "border-amber-200 bg-amber-50/40"
                  : "border-gray-100 hover:border-gray-200"
              } ${dragItemId === item.id ? "opacity-40" : ""}`}
            >
              <DotGrip />
              <span className="w-9 h-9 rounded-lg border border-gray-100 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden relative text-gray-300">
                {item.imageHref ? (
                  <Image src={item.imageHref} alt={item.name ?? ""} fill sizes="36px" className="object-cover" />
                ) : (
                  <Package size={14} />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                {item.sku && (
                  <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
                )}
                {isSplit && (
                  <p className="text-[10px] font-semibold text-amber-600 mt-0.5">
                    {t("splitPart")}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {t("qty", { qty: item.quantity ?? 0 })}
              </span>

              {isSplit && (
                <div className="relative flex-shrink-0" data-kebab-menu>
                  <button
                    type="button"
                    onClick={() =>
                      setUnassignedMenuId(unassignedMenuId === item.id ? null : (item.id ?? null))
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.5"/>
                      <circle cx="12" cy="12" r="1.5"/>
                      <circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                  {unassignedMenuId === item.id && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        className="justify-start px-3 text-gray-700"
                        leftIcon={
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
                            <path d="M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>
                            <path d="M16 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3"/>
                            <path d="M12 2v20"/>
                            <path d="M9 9l3-3 3 3"/>
                            <path d="M9 15l3 3 3-3"/>
                          </svg>
                        }
                        onClick={() => {
                          onRemoveSplit(item.product_id ?? "");
                          setUnassignedMenuId(null);
                        }}
                      >
                        {t("removeSplit", { qty: mergedQty })}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
