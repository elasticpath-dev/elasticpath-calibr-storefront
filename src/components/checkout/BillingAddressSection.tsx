"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Select/Select";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { DeliveryAddress } from "@/components/checkout/shipping/DeliveryAddress";
import { COUNTRIES } from "@/lib/countries";
import { useAuth } from "@/context/AuthContext";
import type { BillingAddr } from "@/hooks/use-ep-stripe-payment";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";
import type { NewAddressFields } from "@/hooks/use-account-addresses";

const SAME_AS_SHIPPING = "__shipping__";
const NEW_ADDRESS = "__new__";
const GUEST_ADDRESS = "__guest__";

type Props = {
  addresses: AccountAddressResponse[];
  /** True when there's no single "the shipping address" to default to —
   * multiple B2B shipping groups, or a digital-only order with no
   * shipping address at all. Hides "Same as shipping" and forces an
   * explicit selection. */
  requireOwnAddress: boolean;
  addAddress: (fields: NewAddressFields) => Promise<AccountAddressResponse | null>;
  onAddressChange: (address: BillingAddr | null | undefined) => void;
  error?: string | null;
};

export function BillingAddressSection({
  addresses, requireOwnAddress, addAddress, onAddressChange, error,
}: Props) {
  const t = useTranslations("checkout");
  const tAddr = useTranslations("address");
  const { isAuthenticated } = useAuth();

  const [selectedId, setSelectedId] = useState<string>(requireOwnAddress ? "" : SAME_AS_SHIPPING);
  // Guest checkout: kept in page state only — never sent to the account
  // addresses API (guests have no account to save it against).
  const [guestAddress, setGuestAddress] = useState<BillingAddr | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<NewAddressFields>({
    first_name: "", last_name: "", line_1: "", line_2: "", city: "", county: "", postcode: "", country: "",
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Reset default selection when this changes
  useEffect(() => {
    setSelectedId(requireOwnAddress ? "" : SAME_AS_SHIPPING);
  }, [requireOwnAddress]);

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId === SAME_AS_SHIPPING) {
      onAddressChange(null);
      return;
    }
    if (selectedId === GUEST_ADDRESS) {
      if (guestAddress) onAddressChange(guestAddress);
      return;
    }
    if (!selectedId || selectedId === NEW_ADDRESS) {
      onAddressChange(undefined);
      return;
    }
    if (selectedAddress) {
      onAddressChange({
        first_name: selectedAddress.first_name ?? "",
        last_name: selectedAddress.last_name ?? "",
        company_name: selectedAddress.company_name ?? undefined,
        line_1: selectedAddress.line_1 ?? "",
        line_2: selectedAddress.line_2 ?? undefined,
        city: selectedAddress.city ?? "",
        postcode: selectedAddress.postcode ?? "",
        county: selectedAddress.county ?? undefined,
        country: selectedAddress.country ?? "",
        region: selectedAddress.region ?? undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedAddress, guestAddress]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === NEW_ADDRESS) {
      setAddressForm({ first_name: "", last_name: "", line_1: "", line_2: "", city: "", county: "", postcode: "", country: "" });
      setAddressError(null);
      setIsModalOpen(true);
    } else {
      setSelectedId(val);
    }
  }

  async function handleAddAddress() {
    if (
      !addressForm.first_name.trim() || !addressForm.last_name.trim() ||
      !addressForm.line_1.trim() || !addressForm.city.trim() ||
      !addressForm.postcode.trim() || !addressForm.country.trim()
    ) {
      setAddressError(tAddr("requiredFieldsError"));
      return;
    }

    // Guests have no account to save an address against — keep it in page
    // state only and use it directly as the order's billing_address.
    if (!isAuthenticated) {
      setGuestAddress({
        first_name: addressForm.first_name.trim(),
        last_name: addressForm.last_name.trim(),
        company_name: addressForm.company_name?.trim() || undefined,
        line_1: addressForm.line_1.trim(),
        line_2: addressForm.line_2?.trim() || undefined,
        city: addressForm.city.trim(),
        postcode: addressForm.postcode.trim(),
        county: addressForm.county?.trim() || undefined,
        country: addressForm.country,
      });
      setSelectedId(GUEST_ADDRESS);
      setAddressError(null);
      setIsModalOpen(false);
      return;
    }

    setAddressSaving(true);
    setAddressError(null);
    try {
      const created = await addAddress(addressForm);
      if (created?.id) {
        setSelectedId(created.id);
        setIsModalOpen(false);
      } else {
        setAddressError(tAddr("createFailed"));
      }
    } catch {
      setAddressError(tAddr("createFailed"));
    } finally {
      setAddressSaving(false);
    }
  }

  function setField(key: keyof NewAddressFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddressForm((f) => ({ ...f, [key]: e.target.value }));
  }

  const options = [
    ...(requireOwnAddress ? [] : [{ value: SAME_AS_SHIPPING, label: t("sameAsBillingShipping") }]),
    ...addresses.map((a) => ({
      value: a.id ?? "",
      label: [
        [a.first_name, a.last_name].filter(Boolean).join(" "),
        [a.line_1, a.city].filter(Boolean).join(", "),
      ].filter(Boolean).join(" – "),
    })),
    ...(guestAddress
      ? [
          {
            value: GUEST_ADDRESS,
            label: [
              [guestAddress.first_name, guestAddress.last_name].filter(Boolean).join(" "),
              [guestAddress.line_1, guestAddress.city].filter(Boolean).join(", "),
            ].filter(Boolean).join(" – "),
          },
        ]
      : []),
    { value: NEW_ADDRESS, label: `+ ${tAddr("createNewTitle")}` },
  ];

  const modalFooter = (
    <>
      <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={addressSaving}>
        {tAddr("cancel")}
      </Button>
      <Button onClick={handleAddAddress} isLoading={addressSaving} disabled={addressSaving}>
        {addressSaving ? tAddr("adding") : tAddr("addButton")}
      </Button>
    </>
  );

  return (
    <>
      <div className="space-y-3">
        <Select
          value={selectedId}
          onChange={handleChange}
          placeholder={requireOwnAddress ? t("selectBillingAddress") : undefined}
          options={options}
          error={error ?? undefined}
        />
        {selectedAddress && selectedId !== SAME_AS_SHIPPING && (
          <DeliveryAddress address={selectedAddress} />
        )}
        {selectedId === GUEST_ADDRESS && guestAddress && (
          <DeliveryAddress address={guestAddress} />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={tAddr("createNewTitle")}
        size="md"
        footer={modalFooter}
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <Input
              label={tAddr("firstName")} value={addressForm.first_name}
              onChange={setField("first_name")} placeholder={tAddr("firstNamePlaceholder")} wrapperClassName="flex-1"
            />
            <Input
              label={tAddr("lastName")} value={addressForm.last_name}
              onChange={setField("last_name")} placeholder={tAddr("lastNamePlaceholder")} wrapperClassName="flex-1"
            />
          </div>
          <Input
            label={tAddr("companyOptional")} value={addressForm.company_name ?? ""}
            onChange={setField("company_name")} placeholder={tAddr("companyPlaceholder")}
          />
          <Input
            label={tAddr("line1")} value={addressForm.line_1}
            onChange={setField("line_1")} placeholder={tAddr("line1Placeholder")}
          />
          <Input
            label={tAddr("line2Optional")} value={addressForm.line_2 ?? ""}
            onChange={setField("line_2")} placeholder={tAddr("line2Placeholder")}
          />
          <div className="flex gap-3">
            <Input
              label={tAddr("city")} value={addressForm.city}
              onChange={setField("city")} placeholder={tAddr("cityPlaceholder")} wrapperClassName="flex-1"
            />
            <Input
              label={tAddr("county")} value={addressForm.county}
              onChange={setField("county")} placeholder={tAddr("countyPlaceholder")} wrapperClassName="flex-1"
            />
          </div>
          <div className="flex gap-3">
            <Input
              label={tAddr("postcode")} value={addressForm.postcode}
              onChange={setField("postcode")} placeholder={tAddr("postcodePlaceholder")} wrapperClassName="flex-1"
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
          {addressError && <p className="text-sm text-red-600">{addressError}</p>}
        </div>
      </Modal>
    </>
  );
}
