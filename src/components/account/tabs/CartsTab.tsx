"use client";

import { useState, useRef, useEffect } from "react";
import { ShoppingCart, MoreHorizontal, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart, type CartSummary } from "@/context/CartContext";
import { usePaginatedCarts } from "@/hooks/use-paginated-carts";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

// ─── Date formatter ──────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateTime(iso: string | undefined): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return {
    date: `${day} ${mon} ${year}`,
    time: `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`,
  };
}

function DateCell({ iso }: { iso: string | undefined }) {
  const fmt = formatDateTime(iso);
  if (!fmt) return <span className="text-gray-400">—</span>;
  return (
    <span className="whitespace-nowrap">
      <span className="block text-sm text-gray-800">{fmt.date}</span>
      <span className="block text-xs text-gray-400">{fmt.time}</span>
    </span>
  );
}

// ─── Kebab menu ───────────────────────────────────────────────────────────────

type MenuOption = {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
};

function KebabMenu({ options }: { options: MenuOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              disabled={opt.disabled}
              onClick={() => {
                setOpen(false);
                opt.onClick();
              }}
              className={[
                "flex w-full items-center px-3 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                opt.className ?? "text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SKELETON_ROWS = 3;

export function CartsTab() {
  const t = useTranslations("account");
  const { cartId, switchCart, updateCart, deleteCart, clearCartById } = useCart();
  const { carts, currentPage, totalPages, isLoading, setPage, refetch } = usePaginatedCarts();

  // Edit modal
  const [editingCart, setEditingCart] = useState<CartSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete cart modal
  const [deletingCart, setDeletingCart] = useState<CartSummary | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Clear items modal
  const [clearingCart, setClearingCart] = useState<CartSummary | null>(null);
  const [clearBusy, setClearBusy] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  function openEdit(cart: CartSummary) {
    setEditName(cart.name);
    setEditDesc(cart.description ?? "");
    setEditError(null);
    setEditingCart(cart);
  }

  async function handleEditSave() {
    if (!editingCart || !editName.trim()) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await updateCart(editingCart.id, editName.trim(), editDesc.trim() || undefined);
      setEditingCart(null);
      refetch();
    } catch {
      setEditError(t("cartEditFailed"));
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDelete() {
    if (!deletingCart) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteCart(deletingCart.id);
      setDeletingCart(null);
      refetch();
    } catch {
      setDeleteError(t("cartDeleteFailed"));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleClear() {
    if (!clearingCart) return;
    setClearBusy(true);
    setClearError(null);
    try {
      await clearCartById(clearingCart.id);
      setClearingCart(null);
      refetch();
    } catch {
      setClearError(t("cartClearFailed"));
    } finally {
      setClearBusy(false);
    }
  }

  const columns = [
    t("cartColumnDetails"),
    t("cartColumnItems"),
    t("cartColumnTotal"),
    t("cartColumnCreated"),
    t("cartColumnUpdated"),
    "",
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">{t("tabCarts")}</h2>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4"><Skeleton height={14} className="mb-1 w-32" /><Skeleton height={11} className="w-48" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-10" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-16" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="mb-1 w-24" /><Skeleton height={11} className="w-16" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="mb-1 w-24" /><Skeleton height={11} className="w-16" /></td>
                  <td className="px-4 py-4 w-8" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : carts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShoppingCart size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-500">{t("noCarts")}</p>
        </div>
      ) : (
        <>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide last:w-8">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {carts.map((cart) => {
                const isActive = cart.id === cartId;
                const menuOptions: MenuOption[] = [
                  {
                    label: t("cartMenuEdit"),
                    onClick: () => openEdit(cart),
                  },
                  {
                    label: t("cartMenuSelect"),
                    onClick: () => switchCart(cart.id),
                    disabled: isActive,
                  },
                  {
                    label: t("cartMenuDeleteCart"),
                    onClick: () => { setDeleteError(null); setDeletingCart(cart); },
                    className: "text-red-600 hover:bg-red-50",
                  },
                  {
                    label: t("cartMenuClearItems"),
                    onClick: () => { setClearError(null); setClearingCart(cart); },
                    className: "text-red-600 hover:bg-red-50",
                  },
                ];

                return (
                  <tr key={cart.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{cart.name}</p>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 shrink-0">
                            <Check size={10} />
                            Active
                          </span>
                        )}
                      </div>
                      {cart.description ? (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{cart.description}</p>
                      ) : (
                        <p className="text-xs text-gray-300 mt-0.5 italic">{t("cartNoDescription")}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {cart.itemCount ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {cart.totalFormatted ?? "—"}
                    </td>
                    <td className="px-4 py-4"><DateCell iso={cart.createdAt} /></td>
                    <td className="px-4 py-4"><DateCell iso={cart.updatedAt} /></td>
                    <td className="px-4 py-4">
                      <KebabMenu options={menuOptions} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-4 justify-end"
        />
        </>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={editingCart !== null}
        onClose={() => setEditingCart(null)}
        title={t("cartEditTitle")}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingCart(null)} disabled={editBusy}>
              {t("cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={editBusy || !editName.trim()}>
              {editBusy ? t("cartEditSaving") : t("cartEditSave")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t("cartEditName")}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Textarea
            label={t("cartEditDesc")}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={3}
          />
          {editError && <p className="text-sm text-red-600">{editError}</p>}
        </div>
      </Modal>

      {/* Delete cart modal */}
      <Modal
        isOpen={deletingCart !== null}
        onClose={() => setDeletingCart(null)}
        title={t("cartMenuDeleteCart")}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingCart(null)} disabled={deleteBusy}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? t("cartDeleting") : t("cartMenuDeleteCart")}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{t("cartDeleteConfirmMsg")}</p>
          {deletingCart && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
              {deletingCart.name}
            </div>
          )}
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
        </div>
      </Modal>

      {/* Clear items modal */}
      <Modal
        isOpen={clearingCart !== null}
        onClose={() => setClearingCart(null)}
        title={t("cartClearConfirmTitle")}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setClearingCart(null)} disabled={clearBusy}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleClear} disabled={clearBusy}>
              {clearBusy ? t("cartClearing") : t("cartClearConfirm")}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{t("cartClearConfirmMsg")}</p>
          {clearingCart && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
              {clearingCart.name}
            </div>
          )}
          {clearError && <p className="text-sm text-red-600">{clearError}</p>}
        </div>
      </Modal>
    </div>
  );
}
