"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getACart, updateACart } from "@epcc-sdk/sdks-shopper";
import { useCart } from "@/context/CartContext";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { useEpClientOptional } from "@/components/ClientProvider";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Local date + time inputs → the `YYYY-MM-DDTHH:mm:ssZ` shape EP expects. */
function toSnapshotDate(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Split an ISO instant into local `YYYY-MM-DD` and `HH:mm` for the inputs. */
function toLocalInputs(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Preview Cart control, rendered in the preview announcement bar
 * (features.previewMode): sets the active cart's `snapshot_date`, so Elastic
 * Path prices and applies promotions as of that future moment. A cart with a
 * snapshot date cannot be checked out, so the dialog also offers to start a
 * fresh cart. Renders nothing when the feature is off or Elastic Path APIs
 * are held (marketing mode, signed out).
 */
export function PreviewCartButton() {
  const { previewMode } = useTenantConfig();
  const t = useTranslations("preview");
  const router = useRouter();
  const epClient = useEpClientOptional();
  const { cartId, createCart, refreshCart } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [cartName, setCartName] = useState<string>("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  // The header's backdrop-filter makes it the containing block for fixed
  // descendants, so the dialog must portal to <body> to cover the viewport.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Read the cart's current snapshot_date (not part of the items payload the
  // cart context loads, so fetch the cart resource itself).
  const loadSnapshot = useCallback(async () => {
    if (!previewMode || !epClient || !cartId) {
      setSnapshotDate(null);
      return;
    }
    try {
      const res = await getACart({
        client: epClient,
        path: { cartID: cartId },
      });
      const data = res.data?.data as
        { snapshot_date?: string; name?: string } | undefined;
      setSnapshotDate(data?.snapshot_date || null);
      setCartName(data?.name ?? "");
    } catch {
      setSnapshotDate(null);
    }
  }, [previewMode, epClient, cartId]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  // Seed the inputs from the current snapshot each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    const seed = snapshotDate
      ? toLocalInputs(snapshotDate)
      : { date: "", time: "" };
    setDate(seed.date);
    setTime(seed.time);
  }, [isOpen, snapshotDate]);

  if (!previewMode || !epClient) return null;

  const apply = async () => {
    if (!date || !time) return;
    const iso = toSnapshotDate(date, time);
    if (new Date(iso).getTime() <= Date.now()) {
      toast.error(t("errorPastDate"));
      return;
    }
    if (!cartId) {
      toast.error(t("errorNoCart"));
      return;
    }
    setBusy(true);
    try {
      const res = await updateACart({
        client: epClient,
        path: { cartID: cartId },
        // `name` is required by the update endpoint; keep the current one.
        body: { data: { name: cartName || "Cart", snapshot_date: iso } },
      });
      if (res.error) {
        const err = (
          res.error as { errors?: Array<{ detail?: string; title?: string }> }
        ).errors?.[0];
        throw new Error(err?.detail || err?.title || "Request failed");
      }
      setSnapshotDate(iso);
      toast.success(t("successSet", { date: formatDisplayDate(iso) }));
      setIsOpen(false);
      // Re-fetch the cart lines (prices/promotions now resolve at the
      // snapshot) and server-rendered data.
      await refreshCart();
      router.refresh();
    } catch (e) {
      toast.error(
        t("errorUpdate", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const startNewCart = async () => {
    setBusy(true);
    try {
      const id = await createCart(t("newCartName"));
      if (!id) throw new Error("Request failed");
      setSnapshotDate(null);
      toast.success(t("successNewCart"));
      setIsOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(
        t("errorUpdate", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const label = snapshotDate
    ? t("cartButtonActive", { date: formatDisplayDate(snapshotDate) })
    : t("cartButton");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={label}
        title={label}
        className={
          "flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors " +
          (snapshotDate
            ? "border-amber-950 bg-amber-950 text-amber-50 hover:bg-amber-900"
            : "border-amber-950/40 bg-white/70 text-amber-950 hover:bg-white")
        }
      >
        <CalendarClock size={16} />
        <span className="max-w-[240px] truncate whitespace-nowrap">{label}</span>
      </button>

      {mounted &&
        createPortal(
          <Modal
            isOpen={isOpen}
            onClose={() => !busy && setIsOpen(false)}
            title={t("dialogTitle")}
            description={t("dialogDescription")}
            size="md"
            footer={
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={busy}
                >
                  {t("cancel")}
                </Button>
                <Button onClick={apply} disabled={busy || !date || !time}>
                  {busy ? t("applying") : t("apply")}
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              {snapshotDate && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
                  <p className="font-medium text-amber-900">
                    {t("currentDate")}
                  </p>
                  <p className="text-amber-800">
                    {formatDisplayDate(snapshotDate)}
                  </p>
                  <button
                    type="button"
                    onClick={startNewCart}
                    disabled={busy}
                    className="mt-1.5 text-xs text-amber-900 underline hover:no-underline disabled:opacity-50"
                  >
                    {t("newCart")}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="preview-date"
                  label={t("date")}
                  type="date"
                  min={todayInput()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Input
                  id="preview-time"
                  label={t("time")}
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
