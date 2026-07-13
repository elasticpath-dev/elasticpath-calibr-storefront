"use client";

import { useCallback, useState, useRef, useEffect, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { WandSparkles, Eraser, X, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CartItemEntry, MatrixGroup } from "./types";
import { buildMatrix } from "./types";
import { Button } from "@/components/ui/Button";

type FillMode =
  | "fillEmpty"
  | "setAll"
  | "addToAll"
  | "subtractFromAll"
  | "increasePercent"
  | "decreasePercent";

const FILL_OPS: Array<{
  mode: FillMode;
  labelKey: string;
  unit?: string;
  defaultValue?: number;
}> = [
  { mode: "fillEmpty", labelKey: "fillEmpty", defaultValue: 12 },
  { mode: "setAll", labelKey: "fillSetAll" },
  { mode: "addToAll", labelKey: "fillAdd" },
  { mode: "subtractFromAll", labelKey: "fillSubtract" },
  { mode: "increasePercent", labelKey: "fillIncreasePercent", unit: "%" },
  { mode: "decreasePercent", labelKey: "fillDecreasePercent", unit: "%" },
];

type FillRowProps = {
  label: string;
  unit?: string;
  defaultValue?: number;
  disabled?: boolean;
  onApply: (v: number) => void;
};

function FillRow({ label, unit, defaultValue, disabled, onApply }: FillRowProps) {
  const t = useTranslations("cart");
  const [val, setVal] = useState(defaultValue !== undefined ? String(defaultValue) : "");
  const apply = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) onApply(n);
  };
  return (
    <div className="flex items-center gap-2 py-[5px]">
      <span className="flex-1 text-[12px] text-ink-700 leading-tight">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={val}
          min={0}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); apply(); }
          }}
          className="w-[52px] h-[26px] text-center text-[12px] font-semibold border border-ink-200 rounded-[5px] bg-white outline-none focus:border-ink-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
          disabled={disabled}
        />
        {unit && <span className="text-[11px] text-ink-500 w-3 text-center">{unit}</span>}
        <Button
          type="button"
          size="xs"
          onClick={apply}
          disabled={disabled || val === ""}
        >
          {t("fillApply")}
        </Button>
      </div>
    </div>
  );
}

type Props = {
  matrixGroup: MatrixGroup;
  cartItemsByProductId: Map<string, CartItemEntry>;
  onQuantityChange: (
    productId: string,
    cartItemId: string | null,
    newQty: number,
  ) => Promise<void>;
  onBulkAdd: (items: Array<{ productId: string; quantity: number }>) => Promise<void>;
  onBulkUpdate: (items: Array<{ cartItemId: string; quantity: number }>) => Promise<void>;
  bulkMode?: boolean;
  pendingQtys?: Map<string, number>;
  onPendingChange?: (productId: string, quantity: number) => void;
  disabled?: boolean;
};

export function MatrixCartRow({
  matrixGroup,
  cartItemsByProductId,
  onQuantityChange,
  onBulkAdd,
  onBulkUpdate,
  bulkMode = false,
  pendingQtys = new Map(),
  onPendingChange,
  disabled,
}: Props) {
  const t = useTranslations("cart");
  const { parentName, parentSku, parentPriceFormatted, children } = matrixGroup;
  const matrix = buildMatrix(children);

  const [drafts, setDrafts] = useState<Map<string, string>>(new Map());
  const [fillOpen, setFillOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const fillBtnRef = useRef<HTMLButtonElement>(null);

  const openFillPanel = () => {
    if (fillBtnRef.current) {
      const rect = fillBtnRef.current.getBoundingClientRect();
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setFillOpen((v) => !v);
  };

  useEffect(() => {
    if (!fillOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        fillBtnRef.current && !fillBtnRef.current.contains(target)
      ) {
        setFillOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fillOpen]);

  const getQty = useCallback(
    (productId: string) => cartItemsByProductId.get(productId)?.quantity ?? 0,
    [cartItemsByProductId],
  );

  const getDisplayQty = useCallback(
    (productId: string) =>
      bulkMode && pendingQtys.has(productId) ? pendingQtys.get(productId)! : getQty(productId),
    [bulkMode, pendingQtys, getQty],
  );

  const getDraft = (productId: string) => {
    if (drafts.has(productId)) return drafts.get(productId)!;
    if (bulkMode && pendingQtys.has(productId)) return String(pendingQtys.get(productId));
    return String(getQty(productId) || "");
  };

  const commitCell = async (productId: string, raw: string) => {
    setDrafts((prev) => { const n = new Map(prev); n.delete(productId); return n; });
    const n = parseInt(raw, 10);
    const qty = isNaN(n) || n < 0 ? 0 : n;
    if (bulkMode) {
      onPendingChange?.(productId, qty);
      return;
    }
    const entry = cartItemsByProductId.get(productId) ?? null;
    await onQuantityChange(productId, entry?.cartItemId ?? null, qty);
  };

  const handleFillApply = async (mode: FillMode, value: number) => {
    switch (mode) {
      case "fillEmpty": {
        const toAdd = children
          .filter((c) => getDisplayQty(c.id) === 0)
          .map((c) => ({ productId: c.id, quantity: value }));
        if (bulkMode) {
          toAdd.forEach(({ productId, quantity }) => onPendingChange?.(productId, quantity));
        } else if (toAdd.length > 0) {
          await onBulkAdd(toAdd);
        }
        break;
      }
      case "setAll": {
        if (bulkMode) {
          children.forEach((c) => onPendingChange?.(c.id, value));
        } else {
          const toAdd = children
            .filter((c) => !cartItemsByProductId.has(c.id))
            .map((c) => ({ productId: c.id, quantity: value }));
          const toUpdate = children
            .filter((c) => cartItemsByProductId.has(c.id))
            .map((c) => ({ cartItemId: cartItemsByProductId.get(c.id)!.cartItemId, quantity: value }));
          await Promise.all([
            toAdd.length > 0 ? onBulkAdd(toAdd) : Promise.resolve(),
            toUpdate.length > 0 ? onBulkUpdate(toUpdate) : Promise.resolve(),
          ]);
        }
        break;
      }
      case "addToAll": {
        if (bulkMode) {
          children.forEach((c) => onPendingChange?.(c.id, Math.max(0, getDisplayQty(c.id) + value)));
        } else {
          const toAdd = children
            .filter((c) => !cartItemsByProductId.has(c.id) && value > 0)
            .map((c) => ({ productId: c.id, quantity: value }));
          const toUpdate = [...cartItemsByProductId.values()].map((e) => ({
            cartItemId: e.cartItemId,
            quantity: Math.max(0, e.quantity + value),
          }));
          await Promise.all([
            toAdd.length > 0 ? onBulkAdd(toAdd) : Promise.resolve(),
            toUpdate.length > 0 ? onBulkUpdate(toUpdate) : Promise.resolve(),
          ]);
        }
        break;
      }
      case "subtractFromAll": {
        if (bulkMode) {
          children.forEach((c) => onPendingChange?.(c.id, Math.max(0, getDisplayQty(c.id) - value)));
        } else {
          const toUpdate = [...cartItemsByProductId.values()].map((e) => ({
            cartItemId: e.cartItemId,
            quantity: Math.max(0, e.quantity - value),
          }));
          if (toUpdate.length > 0) await onBulkUpdate(toUpdate);
        }
        break;
      }
      case "increasePercent": {
        if (bulkMode) {
          children.forEach((c) => {
            const q = getDisplayQty(c.id);
            if (q > 0) onPendingChange?.(c.id, Math.round(q * (1 + value / 100)));
          });
        } else {
          const toUpdate = [...cartItemsByProductId.values()].map((e) => ({
            cartItemId: e.cartItemId,
            quantity: Math.round(e.quantity * (1 + value / 100)),
          }));
          if (toUpdate.length > 0) await onBulkUpdate(toUpdate);
        }
        break;
      }
      case "decreasePercent": {
        if (bulkMode) {
          children.forEach((c) => {
            const q = getDisplayQty(c.id);
            if (q > 0) onPendingChange?.(c.id, Math.max(0, Math.round(q * (1 - value / 100))));
          });
        } else {
          const toUpdate = [...cartItemsByProductId.values()].map((e) => ({
            cartItemId: e.cartItemId,
            quantity: Math.max(0, Math.round(e.quantity * (1 - value / 100))),
          }));
          if (toUpdate.length > 0) await onBulkUpdate(toUpdate);
        }
        break;
      }
    }
  };

  const handleClear = async () => {
    // Single bulk call with quantity 0 removes every item in the matrix.
    const toClear = Array.from(cartItemsByProductId.values()).map((entry) => ({
      cartItemId: entry.cartItemId,
      quantity: 0,
    }));
    if (toClear.length > 0) await onBulkUpdate(toClear);
  };

  const totalUnits = Array.from(cartItemsByProductId.values()).reduce(
    (s, e) => s + e.quantity, 0,
  );

  if (!matrix) {
    return (
      <section className="bg-white border border-ink-200 rounded-[14px] overflow-hidden">
        <header className="flex items-center gap-3 px-[18px] py-[13px] bg-ink-50 border-b border-ink-200">
          <span className="font-bold text-[15px] text-ink-900">{parentName}</span>
          {parentSku && <span className="font-mono text-[11px] text-ink-600">{parentSku}</span>}
          <div className="flex-1" />
          <span className="font-extrabold text-[15px] text-ink-900">
            {t("units", { count: totalUnits })}
          </span>
        </header>
        <div className="px-[18px] py-4 text-[13px] text-ink-600">{t("noVariants")}</div>
      </section>
    );
  }

  const { rowAxisName, colAxisName, rows, cols, cellMap } = matrix;

  const colTotals = cols.map((col) =>
    rows.reduce((s, row) => {
      const key = rowAxisName ? `${row}|${col}` : `|${col}`;
      const child = cellMap.get(key);
      return s + (child ? getDisplayQty(child.id) : 0);
    }, 0),
  );

  const rowTotals = rows.map((row) =>
    cols.reduce((s, col) => {
      const key = rowAxisName ? `${row}|${col}` : `|${col}`;
      const child = cellMap.get(key);
      return s + (child ? getDisplayQty(child.id) : 0);
    }, 0),
  );

  return (
    <section className="bg-white border border-ink-200 rounded-[14px] overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-[18px] py-[13px] bg-ink-50 border-b border-ink-200 flex-wrap">
        <span className="font-bold text-[15px] text-ink-900">{parentName}</span>
        {parentSku && (
          <span className="font-mono text-[11px] text-ink-600">{parentSku}</span>
        )}
        {parentPriceFormatted && (
          <span className="text-[12px] text-ink-600">· {parentPriceFormatted}{t("perUnit")}</span>
        )}
        <div className="flex-1" />
        {totalUnits > 0 && (
          <span className="text-[12px] text-ink-600 mr-1">{t("units", { count: totalUnits })}</span>
        )}

        {/* Fill dropdown */}
        <button
          ref={fillBtnRef}
          onClick={openFillPanel}
          disabled={disabled}
          className={[
            "h-[30px] px-[11px] rounded-[7px] border text-[12px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40",
            fillOpen
              ? "bg-ink-900 border-ink-900 text-white"
              : "border-ink-200 bg-white text-ink-700 hover:bg-ink-100",
          ].join(" ")}
        >
          <WandSparkles size={13} />
          {t("fill")}
          <ChevronDown
            size={12}
            className={fillOpen ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </button>

        {fillOpen && createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="z-[9999] bg-white border border-ink-200 rounded-[12px] shadow-xl w-[300px] p-3"
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-ink-100">
              <span className="text-[12px] font-semibold text-ink-800 flex items-center gap-1.5">
                <WandSparkles size={12} />
                {t("fillPanel")}
              </span>
              <button
                onClick={() => setFillOpen(false)}
                className="text-ink-400 hover:text-ink-700 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            {FILL_OPS.map(({ mode, labelKey, unit, defaultValue }) => (
              <FillRow
                key={mode}
                label={t(labelKey as Parameters<typeof t>[0])}
                unit={unit}
                defaultValue={defaultValue}
                disabled={disabled}
                onApply={(v) => { handleFillApply(mode, v); setFillOpen(false); }}
              />
            ))}
          </div>,
          document.body,
        )}

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleClear}
          disabled={disabled || totalUnits === 0}
          leftIcon={<Eraser size={13} />}
        >
          {t("clearMatrix")}
        </Button>
      </header>

      {/* Scrollable matrix */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(560, 140 + cols.length * 80 + 84) }}>
          {/* Column header */}
          <div className="flex items-center border-b border-ink-200">
            <div className="flex-none w-[140px] px-4 py-[9px] font-mono text-[10px] tracking-[.1em] uppercase text-ink-600">
              {rowAxisName ?? colAxisName}
            </div>
            {cols.map((col) => (
              <div
                key={col}
                className="flex-1 text-center px-1 py-[9px] font-bold text-[12px] text-ink-900 border-l border-ink-100"
              >
                {col}
              </div>
            ))}
            <div className="flex-none w-[84px] text-right px-4 py-[9px] font-mono text-[10px] tracking-[.1em] uppercase text-ink-600">
              {t("total")}
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, rIdx) => (
            <div key={row || rIdx} className="flex items-center border-b border-ink-100">
              <div className="flex-none w-[140px] px-4 flex items-center">
                <span className="font-semibold text-[13px] text-ink-900">{row || "—"}</span>
              </div>

              {cols.map((col) => {
                const key = rowAxisName ? `${row}|${col}` : `|${col}`;
                const child = cellMap.get(key);
                if (!child) {
                  return (
                    <div
                      key={col}
                      className="flex-1 border-l border-ink-100 h-10 flex items-center justify-center"
                      style={{
                        background:
                          "repeating-linear-gradient(45deg,transparent,transparent 5px,var(--color-ink-50) 5px,var(--color-ink-50) 10px)",
                      }}
                    >
                      <span className="text-ink-300 text-[12px]">—</span>
                    </div>
                  );
                }

                const qty = getQty(child.id);
                const draftVal = getDraft(child.id);
                const isPending =
                  bulkMode && pendingQtys.has(child.id) && pendingQtys.get(child.id) !== qty;

                return (
                  <div
                    key={col}
                    className={[
                      "flex-1 border-l border-ink-100 relative transition-colors",
                      isPending ? "bg-amber-50" : "",
                    ].join(" ")}
                  >
                    <input
                      type="number"
                      value={draftVal || ""}
                      placeholder="0"
                      min={0}
                      disabled={disabled}
                      onChange={(e) =>
                        setDrafts((prev) => new Map(prev).set(child.id, e.target.value))
                      }
                      onBlur={(e) => commitCell(child.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          commitCell(child.id, (e.target as HTMLInputElement).value);
                      }}
                      className={[
                        "w-full h-10 text-center text-[13px] font-semibold bg-transparent border-none outline-none",
                        isPending ? "focus:bg-amber-100" : "focus:bg-success-50",
                        "transition-colors",
                        "placeholder:text-ink-300",
                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                        qty > 0 || isPending ? "text-ink-900" : "text-ink-400",
                      ].join(" ")}
                    />
                    {qty > 0 && !isPending && (
                      <span className="absolute top-[3px] right-[5px] text-[10px] font-semibold text-success-600 bg-success-50 px-1 rounded leading-tight">
                        {qty}
                      </span>
                    )}
                    {isPending && (
                      <span className="absolute top-[3px] right-[5px] w-[6px] h-[6px] rounded-full bg-amber-400" />
                    )}
                  </div>
                );
              })}

              <div className="flex-none w-[84px] text-right px-4 font-bold text-[14px] text-ink-900">
                {rowTotals[rIdx] > 0 ? rowTotals[rIdx] : ""}
              </div>
            </div>
          ))}

          {/* Footer totals row */}
          <div className="flex items-center bg-ink-50">
            <div className="flex-none w-[140px] px-4 py-[11px] text-[12px] font-bold text-ink-600">
              {parentPriceFormatted ?? t("perSize")}
            </div>
            {colTotals.map((ct, i) => (
              <div
                key={i}
                className="flex-1 text-center px-1 py-[11px] font-semibold text-[13px] text-ink-600 border-l border-ink-100"
              >
                {ct > 0 ? ct : ""}
              </div>
            ))}
            <div className="flex-none w-[84px] text-right px-4 py-[11px] font-extrabold text-[14px] text-success-600">
              {totalUnits > 0 ? totalUnits : ""}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
