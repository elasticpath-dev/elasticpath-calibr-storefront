"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import {
  getCartItems,
  deleteACartItem,
  manageCarts,
} from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  useAccountAddresses,
  type NewAddressFields,
} from "@/hooks/use-account-addresses";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { Select } from "@/components/ui/Select/Select";
import { Modal } from "@/components/ui/Modal/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { COUNTRIES } from "@/lib/countries";
import { SHIPPING_CUSTOM_ITEM_SKU_PREFIX as B2C_SHIPPING_SKU_PREFIX } from "@/lib/cart-constants";
import { DeliveryAddress } from "./shipping/DeliveryAddress";
import { useShippingMethods } from "./shipping/useShippingMethods";
import { toCurrency } from "./shipping/helpers";
import type { Address } from "./shipping/types";

const NEW_ADDRESS = "__new__";

const EMPTY_NEW_ADDRESS: NewAddressFields = {
  first_name: "",
  last_name: "",
  company_name: "",
  line_1: "",
  line_2: "",
  city: "",
  county: "",
  postcode: "",
  country: "",
};

type Props = {
  /** Address confirmed earlier in the session (survives the step switch). */
  initialAddress?: Address | null;
  onReadyChange?: (ready: boolean) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onAddressChange?: (address: Address | null) => void;
  onShippingCostChange?: (cents: number, currency: string) => void;
};

type AddressFormState = {
  first_name: string;
  last_name: string;
  phone_number: string;
  line_1: string;
  line_2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
};

const EMPTY_FORM: AddressFormState = {
  first_name: "",
  last_name: "",
  phone_number: "",
  line_1: "",
  line_2: "",
  city: "",
  county: "",
  postcode: "",
  country: "",
};

/**
 * B2C delivery step. No shipping-group APIs: the confirmed address lives
 * only in page state and is sent as shipping_address when the order is
 * placed. The selected shipping option is charged through a single
 * "shipping" custom item on the cart (hidden from item lists by
 * CartContext, but included in cart/order totals so payment amounts are
 * correct).
 */
export function B2CDeliverySection({
  initialAddress,
  onReadyChange,
  onLoadingChange,
  onAddressChange,
  onShippingCostChange,
}: Props) {
  const t = useTranslations("checkout");
  const tAddr = useTranslations("address");
  const { cartId, refreshCart } = useCart();
  const { isAuthenticated } = useAuth();
  const {
    addresses,
    isLoading: addressesLoading,
    addAddress,
  } = useAccountAddresses();
  const shippingMethods = useShippingMethods(cartId);

  const methodList = useMemo(
    () =>
      Object.entries(shippingMethods).sort(
        ([, a], [, b]) => a.sort_order - b.sort_order,
      ),
    [shippingMethods],
  );

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [confirmedAddress, setConfirmedAddress] = useState<Address | null>(
    initialAddress ?? null,
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [addressForm, setAddressForm] = useState<AddressFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [methodKey, setMethodKey] = useState<string | null>(null);
  const [appliedMethod, setAppliedMethod] = useState<string | null>(null);

  // Create-address modal (registered shoppers)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<NewAddressFields>(
    EMPTY_NEW_ADDRESS,
  );
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Serialize applies: only the latest requested method wins.
  const applySeq = useRef(0);

  const ready =
    !!confirmedAddress &&
    !!methodKey &&
    appliedMethod === methodKey &&
    !applying;

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);
  useEffect(() => {
    onAddressChange?.(confirmedAddress);
  }, [confirmedAddress, onAddressChange]);

  // ── Initial load: reconcile any shipping custom item on the cart ────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!cartId) return;
      setLoading(true);
      try {
        const client = createEpClient();
        const res = await getCartItems({
          client,
          path: { cartID: cartId },
        }).catch(() => null);
        if (cancelled) return;
        const shippingItems = (res?.data?.data ?? []).filter(
          (i: any) =>
            i.type === "custom_item" &&
            typeof i.sku === "string" &&
            i.sku.startsWith(B2C_SHIPPING_SKU_PREFIX),
        );
        if (shippingItems.length > 0) {
          if (initialAddress) {
            // Same session (e.g. back from the payment step): resume the
            // previously applied method from the item's SKU.
            const key = (shippingItems[0] as any).sku.slice(
              B2C_SHIPPING_SKU_PREFIX.length,
            );
            setMethodKey(key);
            setAppliedMethod(key);
          } else {
            // The address only lives in page state — after a reload it is
            // gone, so a leftover shipping charge must not linger.
            await Promise.all(
              shippingItems.map((i: any) =>
                deleteACartItem({
                  client,
                  path: { cartID: cartId, cartitemID: i.id },
                }).catch(() => {}),
              ),
            );
            await refreshCart();
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  // Drop a resumed method that no longer exists in the configured options.
  useEffect(() => {
    if (!methodKey || methodList.length === 0) return;
    if (!(methodKey in shippingMethods)) {
      setMethodKey(null);
      setAppliedMethod(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodList]);

  // After a resume, reselect the saved address that matches the page state.
  useEffect(() => {
    if (!confirmedAddress || selectedAddressId || addresses.length === 0)
      return;
    const match = addresses.find(
      (a) =>
        (a.line_1 ?? "") === confirmedAddress.line_1 &&
        (a.postcode ?? "") === confirmedAddress.postcode &&
        (a.first_name ?? "") === confirmedAddress.first_name,
    );
    if (match?.id) setSelectedAddressId(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  // ── Apply the selected option as the cart's single shipping item ────────
  const applyShipping = useCallback(
    async (method: string) => {
      if (!cartId) return;
      const m = shippingMethods[method];
      if (!m) return;
      const seq = ++applySeq.current;
      setApplying(true);
      try {
        const client = createEpClient();

        // Remove any previous shipping charge first.
        const res = await getCartItems({
          client,
          path: { cartID: cartId },
        }).catch(() => null);
        const stale = (res?.data?.data ?? []).filter(
          (i: any) =>
            i.type === "custom_item" &&
            typeof i.sku === "string" &&
            i.sku.startsWith(B2C_SHIPPING_SKU_PREFIX),
        );
        await Promise.all(
          stale.map((i: any) =>
            deleteACartItem({
              client,
              path: { cartID: cartId, cartitemID: i.id },
            }).catch(() => {}),
          ),
        );

        if (m.shipping_cost > 0) {
          const addRes = await manageCarts({
            client,
            path: { cartID: cartId },
            body: {
              data: {
                type: "custom_item",
                name: `${t("b2cShippingItemName")} — ${m.shipping_method}`,
                sku: `${B2C_SHIPPING_SKU_PREFIX}${method}`,
                quantity: 1,
                price: { amount: m.shipping_cost, includes_tax: true },
              },
            } as any,
          });
          if (addRes.error) {
            const detail =
              (addRes.error as any)?.errors?.[0]?.detail ??
              JSON.stringify(addRes.error);
            throw new Error(detail);
          }
        }

        if (seq !== applySeq.current) return; // superseded by a newer apply
        setAppliedMethod(method);
        onShippingCostChange?.(m.shipping_cost, m.currency);
        await refreshCart();
      } catch (err) {
        if (seq === applySeq.current) {
          toast.error(
            err instanceof Error ? err.message : t("b2cShippingApplyFailed"),
          );
        }
      } finally {
        if (seq === applySeq.current) setApplying(false);
      }
    },
    [cartId, shippingMethods, refreshCart, onShippingCostChange, t],
  );

  // ── Address handlers (page state only — no cart/shipping API calls) ─────
  function handleSelectSaved(saved: (typeof addresses)[number]) {
    setSelectedAddressId(saved.id ?? null);
    setConfirmedAddress({
      first_name: saved.first_name ?? "",
      last_name: saved.last_name ?? "",
      line_1: saved.line_1 ?? "",
      line_2: saved.line_2 ?? "",
      city: saved.city ?? "",
      postcode: saved.postcode ?? "",
      county: saved.county ?? "",
      country: saved.country ?? "",
      region: saved.region ?? "",
      phone_number: saved.phone_number ?? "",
      company_name: saved.company_name ?? "",
    });
  }

  function handleDropdownChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === NEW_ADDRESS) {
      setModalForm(EMPTY_NEW_ADDRESS);
      setModalError(null);
      setIsModalOpen(true);
      return;
    }
    const saved = addresses.find((a) => a.id === val);
    if (saved) handleSelectSaved(saved);
  }

  async function handleModalSave() {
    const f = modalForm;
    if (
      !f.first_name.trim() ||
      !f.last_name.trim() ||
      !f.line_1.trim() ||
      !f.city.trim() ||
      !f.postcode.trim() ||
      !f.country.trim()
    ) {
      setModalError(tAddr("requiredFieldsError"));
      return;
    }
    setModalSaving(true);
    setModalError(null);
    try {
      const created = await addAddress(f);
      if (created?.id) {
        setIsModalOpen(false);
        handleSelectSaved(created);
      } else {
        setModalError(tAddr("createFailed"));
      }
    } catch {
      setModalError(tAddr("createFailed"));
    } finally {
      setModalSaving(false);
    }
  }

  const setModalField =
    (key: keyof NewAddressFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setModalForm((fm) => ({ ...fm, [key]: e.target.value }));

  function handleConfirmForm() {
    const f = addressForm;
    if (
      !f.first_name.trim() ||
      !f.last_name.trim() ||
      !f.line_1.trim() ||
      !f.city.trim() ||
      !f.postcode.trim() ||
      !f.country.trim()
    ) {
      setFormError(t("b2cAddressIncomplete"));
      return;
    }
    setFormError(null);
    setSelectedAddressId(null);
    setConfirmedAddress({
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      phone_number: f.phone_number.trim(),
      line_1: f.line_1.trim(),
      line_2: f.line_2.trim(),
      city: f.city.trim(),
      county: f.county.trim(),
      postcode: f.postcode.trim(),
      country: f.country,
    });
  }

  function handleEditAddress() {
    if (confirmedAddress) {
      setAddressForm({
        first_name: confirmedAddress.first_name,
        last_name: confirmedAddress.last_name,
        phone_number: confirmedAddress.phone_number ?? "",
        line_1: confirmedAddress.line_1,
        line_2: confirmedAddress.line_2 ?? "",
        city: confirmedAddress.city,
        county: confirmedAddress.county ?? "",
        postcode: confirmedAddress.postcode,
        country: confirmedAddress.country,
      });
    }
    setConfirmedAddress(null);
  }

  function handleSelectMethod(key: string) {
    setMethodKey(key);
    applyShipping(key);
  }

  const setField =
    (field: keyof AddressFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddressForm((f) => ({ ...f, [field]: e.target.value }));

  if (loading) return null;

  // ── Address card ─────────────────────────────────────────────────────────
  const addressDropdownOptions = [
    ...addresses.map((a) => ({
      value: a.id ?? "",
      label: [
        [a.first_name, a.last_name].filter(Boolean).join(" "),
        [a.line_1, a.city].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" – "),
    })),
    { value: NEW_ADDRESS, label: `+ ${tAddr("createNewTitle")}` },
  ];

  const addressCard = (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          <MapPin size={15} className="text-gray-400" />
          {t("b2cDeliveryAddress")}
        </h2>
        {!isAuthenticated && confirmedAddress && (
          <button
            type="button"
            onClick={handleEditAddress}
            className="text-sm text-brand-primary hover:underline"
          >
            {t("b2cChangeAddress")}
          </button>
        )}
      </div>

      {isAuthenticated ? (
        <div className="space-y-3">
          <Select
            value={selectedAddressId ?? ""}
            onChange={handleDropdownChange}
            placeholder={t("b2cSelectAddress")}
            options={addressDropdownOptions}
          />
          {confirmedAddress && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <DeliveryAddress address={confirmedAddress} />
            </div>
          )}
        </div>
      ) : confirmedAddress ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <DeliveryAddress address={confirmedAddress} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={tAddr("firstName")}
              required
              value={addressForm.first_name}
              onChange={setField("first_name")}
            />
            <Input
              label={tAddr("lastName")}
              required
              value={addressForm.last_name}
              onChange={setField("last_name")}
            />
            <div className="sm:col-span-2">
              <Input
                label={tAddr("line1")}
                required
                value={addressForm.line_1}
                onChange={setField("line_1")}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label={tAddr("line2")}
                value={addressForm.line_2}
                onChange={setField("line_2")}
              />
            </div>
            <Input
              label={tAddr("city")}
              required
              value={addressForm.city}
              onChange={setField("city")}
            />
            <Input
              label={tAddr("county")}
              value={addressForm.county}
              onChange={setField("county")}
            />
            <Input
              label={tAddr("postcode")}
              required
              value={addressForm.postcode}
              onChange={setField("postcode")}
            />
            <Combobox
              label={tAddr("country")}
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))}
              value={addressForm.country}
              onChange={(val) =>
                setAddressForm((f) => ({ ...f, country: val }))
              }
              placeholder={tAddr("selectCountry")}
              noResultsText={tAddr("noResults")}
            />
            <div className="sm:col-span-2">
              <Input
                label={t("phone")}
                type="tel"
                value={addressForm.phone_number}
                onChange={setField("phone_number")}
              />
            </div>
          </div>

          {formError && <p className="text-sm text-error-600">{formError}</p>}

          <Button type="button" variant="primary" onClick={handleConfirmForm}>
            {t("b2cConfirmAddress")}
          </Button>
        </div>
      )}
    </div>
  );

  // ── Shipping options card ────────────────────────────────────────────────
  const optionsCard = confirmedAddress && (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          <Truck size={15} className="text-gray-400" />
          {t("b2cShippingOptions")}
        </h2>
        {applying && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 size={13} className="animate-spin" />
            {t("b2cApplyingShipping")}
          </span>
        )}
      </div>

      {methodList.length === 0 ? (
        <p className="text-sm text-gray-500">{t("b2cNoShippingOptions")}</p>
      ) : (
        <div
          className="space-y-2"
          role="radiogroup"
          aria-label={t("b2cShippingOptions")}
        >
          {methodList.map(([key, m]) => {
            const isSelected = methodKey === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={applying}
                onClick={() => handleSelectMethod(key)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors flex items-center gap-3 disabled:opacity-60 ${
                  isSelected
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "border-brand-primary" : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-brand-primary" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">
                    {m.shipping_method}
                  </span>
                  {m.shipping_message && (
                    <span className="block text-xs text-gray-500">
                      {m.shipping_message}
                    </span>
                  )}
                  <span className="block text-xs text-gray-500">
                    {m.delivery_estimate.start}–{m.delivery_estimate.end}{" "}
                    {m.delivery_estimate.unit}
                  </span>
                </span>
                <span className="text-sm font-bold text-gray-900 flex-none">
                  {m.shipping_cost === 0
                    ? t("b2cFreeShipping")
                    : toCurrency(m.shipping_cost, m.currency)}
                </span>
                {isSelected && ready && (
                  <Check size={16} className="text-brand-primary flex-none" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const newAddressModal = (
    <Modal
      isOpen={isModalOpen}
      onClose={() => !modalSaving && setIsModalOpen(false)}
      title={tAddr("createNewTitle")}
      size="lg"
      closeOnBackdrop={!modalSaving}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => setIsModalOpen(false)}
            disabled={modalSaving}
          >
            {tAddr("cancel")}
          </Button>
          <Button
            onClick={handleModalSave}
            isLoading={modalSaving}
            disabled={modalSaving}
          >
            {modalSaving ? tAddr("adding") : tAddr("addButton")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={tAddr("firstName")}
          required
          value={modalForm.first_name}
          onChange={setModalField("first_name")}
        />
        <Input
          label={tAddr("lastName")}
          required
          value={modalForm.last_name}
          onChange={setModalField("last_name")}
        />
        <div className="sm:col-span-2">
          <Input
            label={tAddr("line1")}
            required
            value={modalForm.line_1}
            onChange={setModalField("line_1")}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label={tAddr("line2")}
            value={modalForm.line_2 ?? ""}
            onChange={setModalField("line_2")}
          />
        </div>
        <Input
          label={tAddr("city")}
          required
          value={modalForm.city}
          onChange={setModalField("city")}
        />
        <Input
          label={tAddr("county")}
          value={modalForm.county}
          onChange={setModalField("county")}
        />
        <Input
          label={tAddr("postcode")}
          required
          value={modalForm.postcode}
          onChange={setModalField("postcode")}
        />
        <Combobox
          label={tAddr("country")}
          options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))}
          value={modalForm.country}
          onChange={(val) => setModalForm((f) => ({ ...f, country: val }))}
          placeholder={tAddr("selectCountry")}
          noResultsText={tAddr("noResults")}
        />
        <div className="sm:col-span-2">
          <Input
            label={tAddr("companyOptional")}
            value={modalForm.company_name ?? ""}
            onChange={setModalField("company_name")}
          />
        </div>
      </div>
      {modalError && (
        <p className="mt-3 text-sm text-error-600">{modalError}</p>
      )}
    </Modal>
  );

  return (
    <div className="space-y-5">
      {addressCard}
      {optionsCard}
      {newAddressModal}
    </div>
  );
}
