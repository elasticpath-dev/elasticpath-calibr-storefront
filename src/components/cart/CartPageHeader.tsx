"use client";

import { useState, useRef, useEffect } from "react";
import {
  ClipboardList, ChevronsUpDown,
  Check, Plus, ShoppingCart, Trash2, Eraser, X, ArrowRight, FileText, Tag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

type Props = {
  lang: string;
  totalUnits: number;
  lineCount: number;
  showActions?: boolean;
};

type Confirm = { id: string; action: "clear" | "delete" };

export function CartPageHeader({ lang, totalUnits, lineCount, showActions }: Props) {
  const t = useTranslations("cart");
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cartId, allCarts, switchCart, createCart, deleteCart, clearCartById, clearCart, isLoading, cartTotal, cartSubtotal, cartDiscount, cartDiscountAmount } = useCart();

  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeCart = allCarts.find((c) => c.id === cartId);
  const activeName = activeCart?.name ?? "Cart";

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setCreating(false);
        setConfirm(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function handleSwitch(id: string) {
    if (id === cartId) { setMenuOpen(false); return; }
    setMenuOpen(false);
    setConfirm(null);
    await switchCart(id);
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(false);
    setNewName("");
    setMenuOpen(false);
    await createCart(name);
  }

  async function handleConfirm() {
    if (!confirm) return;
    const { id, action } = confirm;
    setConfirm(null);
    setMenuOpen(false);
    if (action === "delete") await deleteCart(id);
    else await clearCartById(id);
  }

  return (
    <div className="flex items-start justify-between gap-6 flex-wrap">
      {/* Left: requisition switcher (authenticated) or plain cart title (guest) */}
      {isAuthenticated ? (
      <div className="relative" ref={menuRef}>
        <p className="font-mono text-[10px] tracking-[.12em] uppercase text-ink-600 mb-2">
          {t("activeRequisition")}
        </p>
        <button
          onClick={() => { setMenuOpen((o) => !o); setCreating(false); setConfirm(null); }}
          className="flex items-center gap-3.5 bg-white border border-ink-200 rounded-[14px] px-4 py-3 min-w-[340px] text-left hover:border-ink-300 transition-colors"
        >
          <span className="w-[38px] h-[38px] rounded-[10px] bg-brand-primary text-white flex items-center justify-center flex-none">
            <ClipboardList size={19} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-[16px] text-ink-900 tracking-tight truncate">
              {activeName}
            </span>
            <span className="block text-[12px] text-ink-600 mt-0.5">
              {t("units", { count: totalUnits })} · {t("products", { count: lineCount })}
            </span>
          </span>
          <ChevronsUpDown size={18} className="text-ink-400 flex-none" />
        </button>

        {totalUnits > 0 && (
          confirmClearAll ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[12px] font-medium text-warning-600">{t("confirmClearCart")}</span>
              <button
                onClick={async () => { await clearCart(); setConfirmClearAll(false); }}
                disabled={isLoading}
                className="h-6 px-2.5 rounded-[6px] bg-error-600 text-white text-[11px] font-semibold hover:bg-error-700 disabled:opacity-40 transition-colors"
              >
                {t("confirm")}
              </button>
              <button
                onClick={() => setConfirmClearAll(false)}
                className="w-6 h-6 rounded-[6px] border border-ink-200 bg-white text-ink-600 flex items-center justify-center hover:bg-ink-50 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setMenuOpen(false); setConfirmClearAll(true); }}
              disabled={isLoading}
              className="flex items-center gap-1 mt-2 text-[11px] text-ink-400 hover:text-error-600 transition-colors disabled:opacity-40"
            >
              <Eraser size={11} />
              {t("clearAllItems")}
            </button>
          )
        )}

        {menuOpen && (
          <div className="absolute top-full left-0 mt-2 w-[400px] bg-white border border-ink-200 rounded-[14px] shadow-[0_24px_60px_rgba(14,21,33,.18)] overflow-hidden z-30">
            <div className="px-4 py-[11px] font-mono text-[10px] tracking-[.12em] uppercase text-ink-600 bg-ink-50 border-b border-ink-100">
              {t("switchCart")}
            </div>

            {allCarts.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-ink-400">{t("noCartsFound")}</div>
            ) : (
              allCarts.map((c) => {
                const isActive = c.id === cartId;
                const isConfirming = confirm?.id === c.id;

                return (
                  <div key={c.id} className="border-b border-ink-100 last:border-b-0">
                    {/* Confirm bar */}
                    {isConfirming ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-warning-50">
                        <span className="flex-1 text-[13px] font-medium text-warning-600">
                          {confirm!.action === "delete"
                            ? t("confirmDeleteCart")
                            : t("confirmClearCart")}
                        </span>
                        <button
                          onClick={handleConfirm}
                          disabled={isLoading}
                          className="h-7 px-3 rounded-[6px] bg-error-600 text-white text-[12px] font-semibold hover:bg-error-700 disabled:opacity-40 transition-colors"
                        >
                          {t("confirm")}
                        </button>
                        <button
                          onClick={() => setConfirm(null)}
                          className="w-7 h-7 rounded-[6px] border border-ink-200 bg-white text-ink-600 flex items-center justify-center hover:bg-ink-50 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="group flex items-center gap-3 px-4 py-3 hover:bg-ink-50 transition-colors">
                        {/* Cart info — click to switch */}
                        <button
                          onClick={() => handleSwitch(c.id)}
                          disabled={isLoading}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <span className={[
                            "w-8 h-8 rounded-[8px] flex items-center justify-center flex-none transition-colors",
                            isActive ? "bg-brand-primary text-white" : "bg-ink-100 text-ink-600",
                          ].join(" ")}>
                            <ShoppingCart size={15} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold text-[14px] text-ink-900 truncate">{c.name}</span>
                            <span className="block text-[12px] text-ink-600">
                              {c.totalFormatted ?? "—"}
                              {c.itemCount != null ? ` · ${t("items", { count: c.itemCount })}` : ""}
                            </span>
                          </span>
                          {isActive && <Check size={16} className="text-brand-primary flex-none" />}
                        </button>

                        {/* Action buttons — always visible on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirm({ id: c.id, action: "clear" }); }}
                            disabled={isLoading}
                            title={t("clearAllItems")}
                            className="w-7 h-7 rounded-[6px] border border-ink-200 bg-white text-ink-600 flex items-center justify-center hover:border-warning-600 hover:text-warning-600 transition-colors disabled:opacity-40"
                          >
                            <Eraser size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirm({ id: c.id, action: "delete" }); }}
                            disabled={isLoading}
                            title={t("deleteCart")}
                            className="w-7 h-7 rounded-[6px] border border-ink-200 bg-white text-ink-600 flex items-center justify-center hover:border-error-600 hover:text-error-600 transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* New requisition */}
            {creating ? (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-ink-100">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setCreating(false); setNewName(""); }
                  }}
                  placeholder={t("cartNamePlaceholder")}
                  className="flex-1 h-8 px-3 text-[13px] border border-ink-200 rounded-[8px] outline-none focus:border-success-400"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="h-8 px-3 rounded-[8px] bg-ink-900 text-white text-[13px] font-semibold disabled:opacity-40"
                >
                  {t("create")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2.5 w-full px-4 py-3 border-t border-ink-100 text-success-500 font-semibold text-[14px] hover:bg-success-50 transition-colors"
              >
                <Plus size={16} />
                {t("newRequisition")}
              </button>
            )}
          </div>
        )}
      </div>
      ) : (
        <div>
          <div className="flex items-center gap-3.5">
            <span className="w-[38px] h-[38px] rounded-[10px] bg-brand-primary text-white flex items-center justify-center flex-none">
              <ShoppingCart size={19} />
            </span>
            <div>
              <p className="font-bold text-[18px] text-ink-900 tracking-tight">{t("yourCart")}</p>
              <p className="text-[12px] text-ink-600 mt-0.5">
                {t("units", { count: totalUnits })} · {t("products", { count: lineCount })}
              </p>
            </div>
          </div>
          {totalUnits > 0 && (
            confirmClearAll ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[12px] font-medium text-warning-600">{t("confirmClearCart")}</span>
                <button
                  onClick={async () => { await clearCart(); setConfirmClearAll(false); }}
                  disabled={isLoading}
                  className="h-6 px-2.5 rounded-[6px] bg-error-600 text-white text-[11px] font-semibold hover:bg-error-700 disabled:opacity-40 transition-colors"
                >
                  {t("confirm")}
                </button>
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="w-6 h-6 rounded-[6px] border border-ink-200 bg-white text-ink-600 flex items-center justify-center hover:bg-ink-50 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClearAll(true)}
                disabled={isLoading}
                className="flex items-center gap-1 mt-2 text-[11px] text-ink-400 hover:text-error-600 transition-colors disabled:opacity-40"
              >
                <Eraser size={11} />
                {t("clearAllItems")}
              </button>
            )
          )}
        </div>
      )}

      {/* Right: order total + actions (grid view only) */}
      {showActions && (
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          {/* Totals */}
          <div className="flex items-center gap-4 flex-wrap justify-end">
            {cartDiscountAmount < 0 && cartSubtotal ? (
              <>
                <div className="flex items-center gap-1.5 text-[13px] text-ink-600">
                  <span>{t("subtotal")}</span>
                  <span>{cartSubtotal}</span>
                </div>
                <div className="flex items-center gap-1 text-[13px] text-success-500">
                  <Tag size={12} />
                  <span>{t("discount")}</span>
                  <span className="font-semibold">{cartDiscount}</span>
                </div>
                <div className="w-px h-4 bg-ink-200" />
              </>
            ) : null}
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-semibold text-ink-600">{t("total")}</span>
              <span className="text-[24px] font-bold text-ink-900 leading-none">{cartTotal}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button
                type="button"
                variant="outline"
                disabled={lineCount === 0}
                leftIcon={<FileText size={15} />}
                onClick={() => router.push(`/${lang}/quote-request`)}
              >
                {t("requestQuote")}
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              disabled={lineCount === 0}
              rightIcon={<ArrowRight size={16} />}
              onClick={() => router.push(`/${lang}/checkout`)}
            >
              {t("checkout")}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
