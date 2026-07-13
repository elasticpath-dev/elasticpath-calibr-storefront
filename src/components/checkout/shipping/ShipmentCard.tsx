"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Trash2, Package, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { QuantitySelector } from "@/components/product/QuantitySelector";
import { toCurrency, formatEstimateDate } from "./helpers";
import type { CartItem, Group, ShippingMethod, SplitState } from "./types";
import { DeliveryAddress } from "./DeliveryAddress";

// ── Shared icons ──────────────────────────────────────────────────────────────

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

const BoxIcon = () => (
  <svg
    width="17" height="17" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M16.5 9.4 7.55 4.24"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  activeGroup: Group;
  grpIndex: number;
  activeItems: CartItem[];
  isDragOver: boolean;
  groups: Group[];
  groupEstimates: Record<string, { start: string; end: string }>;
  groupMethods: Record<string, string>;
  shippingMethods: Record<string, ShippingMethod>;
  editingNameId: string | null;
  editingNameValue: string;
  split: SplitState | null;
  openMenuId: string | null;
  moveMenuId: string | null;
  dragItemId: string | null;
  getShipmentName: (groupId: string, index: number) => string;
  setEditingNameValue: (v: string) => void;
  setOpenMenuId: (id: string | null) => void;
  setMoveMenuId: (id: string | null) => void;
  setSplit: (fn: ((p: SplitState | null) => SplitState | null) | null) => void;
  startEditName: (groupId: string, current: string) => void;
  saveEditName: () => void;
  cancelEditName: () => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDragLeave: (e: React.DragEvent, targetId: string) => void;
  onDrop: (e: React.DragEvent, groupId: string) => void;
  onDragStart: (itemId: string) => void;
  onDragEnd: () => void;
  onAssignItem: (itemId: string, groupId: string) => void;
  onRemoveFromShipment: (itemId: string) => void;
  onSplitConfirm: () => void;
  onDeleteRequest: (groupId: string) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ShipmentCard({
  activeGroup, grpIndex, activeItems, isDragOver,
  groups, groupEstimates, groupMethods, shippingMethods,
  editingNameId, editingNameValue, split, openMenuId, moveMenuId, dragItemId,
  getShipmentName, setEditingNameValue, setOpenMenuId, setMoveMenuId, setSplit,
  startEditName, saveEditName, cancelEditName,
  onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd,
  onAssignItem, onRemoveFromShipment, onSplitConfirm, onDeleteRequest,
}: Props) {
  const t = useTranslations("shipping");
  const units = activeItems.reduce((s, i) => s + (i.quantity ?? 0), 0);

  const methodKey = groupMethods[activeGroup.id] ?? "";
  const method = shippingMethods[methodKey];
  const estimate = groupEstimates[activeGroup.id];
  const shipmentName = getShipmentName(activeGroup.id, grpIndex);

  return (
    <Card>
      {/* ── Card header ──────────────────────────────────────────────────── */}
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <BoxIcon />
            </div>
            <div className="min-w-0">
              {editingNameId === activeGroup.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editingNameValue}
                    onChange={(e) => setEditingNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditName();
                      if (e.key === "Escape") cancelEditName();
                    }}
                    onBlur={saveEditName}
                    autoFocus
                    className="text-base font-bold text-gray-900 leading-tight bg-transparent border-b border-gray-400 focus:border-brand-primary focus:outline-none w-40"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); saveEditName(); }}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); cancelEditName(); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-base font-bold text-gray-900 leading-tight">{shipmentName}</p>
                  <button
                    type="button"
                    title={t("editName")}
                    onClick={() => startEditName(activeGroup.id, shipmentName)}
                    className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {activeItems.length === 0
                  ? t("emptyShipment")
                  : t("linesAndUnits", { lines: activeItems.length, units })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title={t("deleteShipment")}
            className="text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 border border-gray-100"
            onClick={() => onDeleteRequest(activeGroup.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>

        {/* Deliver to */}
        {(activeGroup.address.line_1 || activeGroup.address.first_name) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
              {t("deliverTo")}
            </p>
            <DeliveryAddress address={activeGroup.address} />
            {estimate?.end && (
              <div className="flex items-center gap-2 mt-2">
                <svg
                  className="flex-shrink-0 text-gray-400"
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p className="text-sm text-gray-600">
                  {t("on")} {formatEstimateDate(estimate.end)}
                </p>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      {/* ── Product drop zone ─────────────────────────────────────────────── */}
      <CardBody
        onDragOver={(e) => onDragOver(e, activeGroup.id)}
        onDragLeave={(e) => onDragLeave(e, activeGroup.id)}
        onDrop={(e) => onDrop(e, activeGroup.id)}
        className={`space-y-2.5 min-h-[90px] transition-all ${
          isDragOver ? "bg-green-50 ring-2 ring-inset ring-brand-primary" : ""
        }`}
      >
        {activeItems.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-7 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
            <svg
              width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M12 3v12"/><path d="m8 11 4 4 4-4"/>
              <rect x="4" y="17" width="16" height="4" rx="1"/>
            </svg>
            <span className="text-xs">{t("dragHint")}</span>
          </div>
        )}

        {activeItems.map((item) => (
          <div key={item.id}>
            {/* Item row */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", item.id ?? "");
                onDragStart(item.id ?? "");
              }}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:shadow-sm transition-all ${
                dragItemId === item.id ? "opacity-40" : ""
              }`}
            >
              <DotGrip />
              <span className="w-11 h-11 rounded-lg border border-gray-200 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden relative text-gray-300">
                {item.imageHref ? (
                  <Image src={item.imageHref} alt={item.name ?? ""} fill sizes="44px" className="object-cover" />
                ) : (
                  <Package size={18} />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                  {item.name}
                </p>
                {item.sku && (
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5 tracking-wide">
                    {item.sku}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-500">{t("qty", { qty: item.quantity ?? 0 })}</p>
                {item.meta?.display_price?.without_tax?.value?.formatted && (
                  <p className="text-sm font-bold text-gray-900">
                    {item.meta.display_price.without_tax.value.formatted}
                  </p>
                )}
              </div>

              {/* Split button — only when qty > 1, not a subscription item, and
                  not a custom_item (splitting is matched by product_id, which
                  custom items don't have). */}
              {(item.quantity ?? 0) > 1 && item.type !== "subscription_item" && item.type !== "custom_item" && (
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                      <path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/>
                    </svg>
                  }
                  onClick={() => {
                    if (split?.itemId === item.id) { setSplit(null); return; }
                    const others = groups.filter((g) => g.id !== activeGroup.id);
                    setSplit(() => ({
                      itemId: item.id ?? "",
                      productId: item.product_id ?? "",
                      currentGroupId: activeGroup.id,
                      totalQty: item.quantity ?? 1,
                      splitQty: 1,
                      targetGroupId: others[0]?.id ?? "",
                    }));
                  }}
                >
                  {t("split")}
                </Button>
              )}

              {/* Kebab menu */}
              <div className="relative flex-shrink-0" data-kebab-menu>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(openMenuId === item.id ? null : (item.id ?? null));
                    setMoveMenuId(null);
                    setSplit(null);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="12" cy="19" r="2"/>
                  </svg>
                </button>

                {openMenuId === item.id && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5">
                    {/* Move product */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setMoveMenuId(moveMenuId === item.id ? null : (item.id ?? null))
                        }
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                          </svg>
                          {t("moveProduct")}
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 18 6-6-6-6"/>
                        </svg>
                      </button>

                      {moveMenuId === item.id && (
                        <div className="absolute right-full top-0 mr-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5">
                          <p className="px-3 pt-0.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            {t("moveTo")}
                          </p>
                          {groups.filter((g) => g.id !== activeGroup.id).length === 0 ? (
                            <p className="px-3 py-2 text-xs text-gray-400 italic">
                              {t("noOtherShipments")}
                            </p>
                          ) : (
                            groups
                              .filter((g) => g.id !== activeGroup.id)
                              .map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => {
                                    onAssignItem(item.id ?? "", g.id);
                                    setOpenMenuId(null);
                                    setMoveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                  </svg>
                                  {getShipmentName(g.id, groups.indexOf(g))}
                                </button>
                              ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        onRemoveFromShipment(item.id ?? "");
                        setOpenMenuId(null);
                        setMoveMenuId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5"
                    >
                      <Trash2 size={13} />
                      {t("deleteFromShipment")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Split panel */}
            {split?.itemId === item.id && split && item.type !== "subscription_item" && (() => {
              const s: SplitState = split;
              const others = groups.filter((g) => g.id !== activeGroup.id);
              return (
                <div className="mt-2 ml-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
                      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                      <path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/>
                    </svg>
                    {t("splitThisLine")}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
                    <span>{t("splitMove")}</span>
                    <QuantitySelector
                      value={s.splitQty}
                      min={1}
                      max={s.totalQty - 1}
                      onChange={(v) =>
                        setSplit((p) => p ? { ...p, splitQty: v } : p)
                      }
                    />
                    <span>{t("splitOf", { qty: s.totalQty })}</span>
                    <select
                      value={s.targetGroupId}
                      onChange={(e) =>
                        setSplit((p) => p ? { ...p, targetGroupId: e.target.value } : p)
                      }
                      className="px-2.5 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {others.map((g) => (
                        <option key={g.id} value={g.id}>
                          {getShipmentName(g.id, groups.indexOf(g))}
                        </option>
                      ))}
                      {others.length === 0 && (
                        <option value="" disabled>{t("splitFirst")}</option>
                      )}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      disabled={!s.targetGroupId || others.length === 0}
                      leftIcon={
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      }
                      onClick={onSplitConfirm}
                    >
                      {t("splitLine")}
                    </Button>
                    <Button variant="outline" size="xs" onClick={() => setSplit(null)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </CardBody>

      {/* ── Shipping method ───────────────────────────────────────────────── */}
      {method && (
        <CardFooter className="justify-between">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 hidden">
              {t("methodSection")}
            </p>
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
                <rect x="9" y="11" width="14" height="10" rx="1"/>
                <path d="M5 17v4"/><path d="M9 17v4"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-900">{method.shipping_method}</p>
          </div>
          <span className={`text-base font-bold flex-shrink-0 ${method.shipping_cost === 0 ? "text-green-600" : "text-gray-900"}`}>
            {method.shipping_cost === 0 ? t("free") : toCurrency(method.shipping_cost, method.currency)}
          </span>
        </CardFooter>
      )}
    </Card>
  );
}
