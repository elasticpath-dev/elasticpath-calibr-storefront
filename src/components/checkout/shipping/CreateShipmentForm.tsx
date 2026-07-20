"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal/Modal";
import { Card, CardBody } from "@/components/ui/Card";
import { Combobox } from "@/components/ui/Combobox";
import { Package } from "lucide-react";
import { toCurrency } from "./helpers";
import { DeliveryAddress } from "./DeliveryAddress";
import { COUNTRIES } from "@/lib/countries";
import type { NewAddressFields } from "@/hooks/use-account-addresses";
import type { Address, CartItem, ShippingMethod } from "./types";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";

type Props = {
  addresses: AccountAddressResponse[];
  methodList: [string, ShippingMethod][];
  shippingMethods: Record<string, ShippingMethod>;
  unassigned: CartItem[];
  pickedItems: string[];
  creating: boolean;
  formAddressId: string;
  formInlineAddr: Partial<Address>;
  formMethodKey: string;
  formEstimateEnd: string;
  formAddress: Address | null;
  today: string;
  addAddress: (fields: NewAddressFields) => Promise<AccountAddressResponse | null>;
  setFormAddressId: (v: string) => void;
  setFormInlineAddr: (fn: (prev: Partial<Address>) => Partial<Address>) => void;
  setFormMethodKey: (v: string) => void;
  setFormEstimateEnd: (v: string) => void;
  setPickedItems: (fn: (prev: string[]) => string[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function CreateShipmentForm({
  addresses, methodList, shippingMethods, unassigned,
  pickedItems, creating, formAddressId, formInlineAddr,
  formMethodKey, formEstimateEnd, formAddress, today,
  addAddress, setFormAddressId, setFormInlineAddr, setFormMethodKey,
  setFormEstimateEnd, setPickedItems, onSubmit, onCancel,
}: Props) {
  const t = useTranslations("shipping");
  const tAddr = useTranslations("address");

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<NewAddressFields>({
    first_name: "", last_name: "", line_1: "", line_2: "", city: "", county: "", postcode: "", country: "",
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  function openAddressModal() {
    setAddressForm({ first_name: "", last_name: "", line_1: "", line_2: "", city: "", county: "", postcode: "", country: "" });
    setAddressError(null);
    setIsAddressModalOpen(true);
  }

  async function handleAddAddress() {
    if (!addressForm.first_name.trim() || !addressForm.last_name.trim() || !addressForm.line_1.trim() || !addressForm.city.trim() || !addressForm.county.trim() || !addressForm.postcode.trim() || !addressForm.country.trim()) {
      setAddressError(tAddr("requiredFieldsError"));
      return;
    }
    setAddressSaving(true);
    setAddressError(null);
    try {
      const created = await addAddress(addressForm);
      if (created?.id) {
        setFormAddressId(created.id);
        setIsAddressModalOpen(false);
      } else {
        setAddressError(tAddr("createFailed"));
      }
    } catch {
      setAddressError("Failed to create address. Please try again.");
    } finally {
      setAddressSaving(false);
    }
  }

  const setAddr = (key: keyof NewAddressFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddressForm((f) => ({ ...f, [key]: e.target.value }));

  const selectedAddress = addresses.find((a) => a.id === formAddressId) ?? null;

  const addressModalFooter = (
    <>
      <Button variant="outline" onClick={() => setIsAddressModalOpen(false)} disabled={addressSaving}>
        {tAddr("cancel")}
      </Button>
      <Button onClick={handleAddAddress} disabled={addressSaving}>
        {addressSaving ? tAddr("adding") : tAddr("addButton")}
      </Button>
    </>
  );

  return (
    <>
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900">{t("newShipment")}</p>

      {/* Address */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {t("deliveryAddress")}
        </p>
        <Select
          placeholder={t("selectAddress")}
          value={formAddressId}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "__new__") { openAddressModal(); }
            else { setFormAddressId(val); }
          }}
          options={[
            ...addresses.map((a) => ({
              value: a.id ?? "",
              label: [
                [a.first_name, a.last_name].filter(Boolean).join(" "),
                [a.line_1, a.city].filter(Boolean).join(", "),
              ].filter(Boolean).join(" – "),
            })),
            { value: "__new__", label: `+ ${t("enterNewAddress")}` },
          ]}
        />
        {selectedAddress && (
          <Card className="rounded-xl border-gray-200 shadow-none">
            <CardBody className="py-3">
              <DeliveryAddress address={selectedAddress} />
            </CardBody>
          </Card>
        )}
      </div>

      {/* Shipping method */}
      {methodList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t("methodSection")}
          </p>
          <div className="flex gap-2.5 flex-wrap">
            {methodList.map(([key, m]) => {
              const sel = formMethodKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormMethodKey(key)}
                  className={`flex-1 min-w-[140px] text-left p-3 rounded-xl border-[1.5px] flex flex-col gap-1.5 transition-all ${
                    sel
                      ? "border-brand-primary bg-green-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-900">{m.shipping_method}</span>
                    <span
                      className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${
                        sel ? "border-brand-primary bg-brand-primary" : "border-gray-300"
                      }`}
                    >
                      {sel && (
                        <svg
                          width="8" height="8" viewBox="0 0 24 24"
                          fill="none" stroke="#fff" strokeWidth="3.5"
                          strokeLinecap="round" strokeLinejoin="round"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {m.delivery_estimate.start}–{m.delivery_estimate.end}{" "}
                    {m.delivery_estimate.unit}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      m.shipping_cost === 0 ? "text-green-600" : "text-gray-900"
                    }`}
                  >
                    {m.shipping_cost === 0
                      ? t("included")
                      : toCurrency(m.shipping_cost, m.currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Shipment date */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {t("shipmentDate")}
        </p>
        <Input
          type="date"
          value={formEstimateEnd}
          min={today}
          onChange={(e) => setFormEstimateEnd(e.target.value)}
        />
      </div>

      {/* Items to assign */}
      {unassigned.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {t("itemsToAssign")}
              {pickedItems.length > 0 && (
                <span className="ml-2 normal-case text-brand-primary">
                  {t("selectedCount", { count: pickedItems.length })}
                </span>
              )}
            </p>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 hover:text-gray-700">
              <Checkbox
                checked={pickedItems.length === unassigned.length}
                onChange={(e) => {
                  setPickedItems(() =>
                    e.target.checked ? unassigned.map((i) => i.id ?? "") : [],
                  );
                }}
              />
              {t("selectAll")}
            </label>
          </div>
          <div className="rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {unassigned.map((item) => {
              const checked = pickedItems.includes(item.id ?? "");
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
                    checked ? "bg-green-50" : "hover:bg-gray-50"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onChange={(e) => {
                      const id = item.id ?? "";
                      setPickedItems((p) =>
                        e.target.checked ? [...p, id] : p.filter((x) => x !== id),
                      );
                    }}
                  />
                  <span className="w-10 h-10 rounded-lg border border-gray-100 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                    {item.imageHref ? (
                      <Image
                        src={item.imageHref}
                        alt={item.name ?? ""}
                        fill
                        sizes="40px"
                        className="object-contain"
                      />
                    ) : (
                      <Package size={16} className="text-gray-300" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 truncate">
                      {item.name}
                    </span>
                    {item.sku && (
                      <span className="block text-xs text-gray-400 font-mono mt-0.5">
                        {item.sku}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    {t("qty", { qty: item.quantity ?? 0 })}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <div className="flex gap-2">
          <Button
            fullWidth
            onClick={onSubmit}
            isLoading={creating}
            disabled={creating || !formAddress || pickedItems.length === 0 || !formEstimateEnd}
          >
            {t("createShipment")}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
        </div>
        {!formAddress && (
          <p className="text-xs text-amber-600 text-center">{t("fillAddress")}</p>
        )}
        {formAddress && pickedItems.length === 0 && (
          <p className="text-xs text-amber-600 text-center">{t("selectItems")}</p>
        )}
        {formAddress && pickedItems.length > 0 && !formEstimateEnd && (
          <p className="text-xs text-amber-600 text-center">{t("selectDate")}</p>
        )}
      </div>
    </div>

      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={tAddr("createNewTitle")}
        size="md"
        footer={addressModalFooter}
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <Input
              label={tAddr("firstName")}
              value={addressForm.first_name}
              onChange={setAddr("first_name")}
              placeholder="Jane"
              wrapperClassName="flex-1"
            />
            <Input
              label={tAddr("lastName")}
              value={addressForm.last_name}
              onChange={setAddr("last_name")}
              placeholder="Smith"
              wrapperClassName="flex-1"
            />
          </div>
          <Input
            label={tAddr("companyOptional")}
            value={addressForm.company_name ?? ""}
            onChange={setAddr("company_name")}
            placeholder="Acme Corp"
          />
          <Input
            label={tAddr("line1")}
            value={addressForm.line_1}
            onChange={setAddr("line_1")}
            placeholder="123 Main St"
          />
          <Input
            label={tAddr("line2Optional")}
            value={addressForm.line_2 ?? ""}
            onChange={setAddr("line_2")}
            placeholder="Suite 100"
          />
          <div className="flex gap-3">
            <Input
              label={tAddr("city")}
              value={addressForm.city}
              onChange={setAddr("city")}
              placeholder="San Francisco"
              wrapperClassName="flex-1"
            />
            <Input
              label={tAddr("county")}
              value={addressForm.county}
              onChange={setAddr("county")}
              placeholder="California"
              wrapperClassName="flex-1"
            />
          </div>
          <div className="flex gap-3">
            <Input
              label={tAddr("postcode")}
              value={addressForm.postcode}
              onChange={setAddr("postcode")}
              placeholder="94105"
              wrapperClassName="flex-1"
            />
            <Combobox
              label={tAddr("country")}
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))}
              value={addressForm.country}
              onChange={(val) => setAddressForm((f) => ({ ...f, country: val }))}
              placeholder={tAddr("selectCountry")}
              noResultsText={tAddr("noResults")}
              wrapperClassName="flex-1"
            />
          </div>
          {addressError && (
            <p className="text-sm text-red-600">{addressError}</p>
          )}
        </div>
      </Modal>
    </>
  );
}
