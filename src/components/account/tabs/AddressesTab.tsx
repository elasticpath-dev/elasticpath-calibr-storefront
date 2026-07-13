"use client";

import { useState } from "react";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useAccountAddresses,
  type NewAddressFields,
} from "@/hooks/use-account-addresses";
import { DeliveryAddress } from "@/components/checkout/shipping/DeliveryAddress";
import { Modal } from "@/components/ui/Modal/Modal";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { COUNTRIES } from "@/lib/countries";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";

type ModalMode = "create" | "edit" | null;

const EMPTY_FORM: NewAddressFields = {
  first_name: "",
  last_name: "",
  line_1: "",
  line_2: "",
  city: "",
  county: "",
  postcode: "",
  country: "",
};

function addressToForm(addr: AccountAddressResponse): NewAddressFields {
  return {
    first_name: addr.first_name ?? "",
    last_name: addr.last_name ?? "",
    line_1: addr.line_1 ?? "",
    line_2: addr.line_2 ?? "",
    city: addr.city ?? "",
    county: addr.county ?? "",
    postcode: addr.postcode ?? "",
    country: addr.country ?? "",
    company_name: addr.company_name ?? "",
  };
}

export function AddressesTab() {
  const t = useTranslations("account");
  const tAddr = useTranslations("address");
  const { addresses, isLoading, addAddress, editAddress, deleteAddress } =
    useAccountAddresses();

  // Address form modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewAddressFields>(EMPTY_FORM);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal
  const [deletingAddress, setDeletingAddress] =
    useState<AccountAddressResponse | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditingId(null);
    setModalMode("create");
  }

  function openEdit(addr: AccountAddressResponse) {
    setForm(addressToForm(addr));
    setFormError(null);
    setEditingId(addr.id ?? null);
    setModalMode("edit");
  }

  function closeFormModal() {
    setModalMode(null);
    setFormError(null);
  }

  function openDelete(addr: AccountAddressResponse) {
    setDeleteError(null);
    setDeletingAddress(addr);
  }

  function closeDeleteModal() {
    setDeletingAddress(null);
    setDeleteError(null);
  }

  async function handleFormSave() {
    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.line_1.trim() ||
      !form.city.trim() ||
      !form.county.trim() ||
      !form.postcode.trim() ||
      !form.country.trim()
    ) {
      setFormError(tAddr("requiredFieldsError"));
      return;
    }
    setFormBusy(true);
    setFormError(null);
    try {
      if (modalMode === "edit" && editingId) {
        const updated = await editAddress(editingId, form);
        if (updated) {
          closeFormModal();
        } else {
          setFormError(tAddr("editFailed"));
        }
      } else {
        const created = await addAddress(form);
        if (created) {
          closeFormModal();
        } else {
          setFormError(tAddr("createFailed"));
        }
      }
    } catch {
      setFormError(
        modalMode === "edit" ? tAddr("editFailed") : tAddr("createFailed"),
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDelete() {
    if (!deletingAddress?.id) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteAddress(deletingAddress.id);
      closeDeleteModal();
    } catch {
      setDeleteError(tAddr("deleteFailed"));
    } finally {
      setDeleteBusy(false);
    }
  }

  const setField =
    (key: keyof NewAddressFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const isEdit = modalMode === "edit";

  const formModalFooter = (
    <>
      <Button variant="outline" onClick={closeFormModal} disabled={formBusy}>
        {tAddr("cancel")}
      </Button>
      <Button onClick={handleFormSave} disabled={formBusy}>
        {formBusy
          ? isEdit
            ? tAddr("editing")
            : tAddr("adding")
          : isEdit
            ? tAddr("editButton")
            : tAddr("addButton")}
      </Button>
    </>
  );

  const deleteModalFooter = (
    <>
      <Button
        variant="outline"
        onClick={closeDeleteModal}
        disabled={deleteBusy}
      >
        {tAddr("cancel")}
      </Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={deleteBusy}
      >
        {deleteBusy ? tAddr("deleting") : tAddr("deleteConfirm")}
      </Button>
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">
          {t("tabAddresses")}
        </h2>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
          {t("addAddress")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={130} className="rounded-xl" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <MapPin size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-500">
            {t("noAddresses")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            leftIcon={<Plus size={14} />}
            onClick={openCreate}
          >
            {t("addAddress")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {addresses.map((addr) => (
            <Card
              key={addr.id}
              className="rounded-xl border-gray-200 shadow-none hover:border-gray-300 transition-colors h-full"
            >
              <CardBody className="p-4 flex flex-col h-full">
                <div className="flex-1">
                  <DeliveryAddress address={addr} />
                </div>
                <div className="flex gap-2 mt-4 pt-1 justify-end border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                    leftIcon={<Pencil size={13} />}
                    onClick={() => openEdit(addr)}
                  >
                    {tAddr("edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    leftIcon={<Trash2 size={13} />}
                    onClick={() => openDelete(addr)}
                  >
                    {tAddr("deleteConfirm")}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}

          {/* Ghost "add" tile */}
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-primary/50 transition-colors flex flex-col items-center justify-center gap-2 py-8 text-gray-400 hover:text-brand-primary"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">{t("addAddress")}</span>
          </button>
        </div>
      )}

      {/* Create / Edit address modal */}
      <Modal
        isOpen={modalMode !== null}
        onClose={closeFormModal}
        title={isEdit ? tAddr("editTitle") : tAddr("createNewTitle")}
        size="md"
        footer={formModalFooter}
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <Input
              label={tAddr("firstName")}
              value={form.first_name}
              onChange={setField("first_name")}
              placeholder="Jane"
              wrapperClassName="flex-1"
            />
            <Input
              label={tAddr("lastName")}
              value={form.last_name}
              onChange={setField("last_name")}
              placeholder="Smith"
              wrapperClassName="flex-1"
            />
          </div>
          <Input
            label={tAddr("companyOptional")}
            value={form.company_name ?? ""}
            onChange={setField("company_name")}
            placeholder="Acme Corp"
          />
          <Input
            label={tAddr("line1")}
            value={form.line_1}
            onChange={setField("line_1")}
            placeholder="123 Main St"
          />
          <Input
            label={tAddr("line2Optional")}
            value={form.line_2 ?? ""}
            onChange={setField("line_2")}
            placeholder="Suite 100"
          />
          <div className="flex gap-3">
            <Input
              label={tAddr("city")}
              value={form.city}
              onChange={setField("city")}
              placeholder="San Francisco"
              wrapperClassName="flex-1"
            />
            <Input
              label={tAddr("county")}
              value={form.county}
              onChange={setField("county")}
              placeholder="California"
              wrapperClassName="flex-1"
            />
          </div>
          <div className="flex gap-3">
            <Input
              label={tAddr("postcode")}
              value={form.postcode}
              onChange={setField("postcode")}
              placeholder="94105"
              wrapperClassName="flex-1"
            />
            <Combobox
              label={tAddr("country")}
              options={COUNTRIES.map((c) => ({
                value: c.code,
                label: c.label,
              }))}
              value={form.country}
              onChange={(val) => setForm((f) => ({ ...f, country: val }))}
              placeholder={tAddr("selectCountry")}
              noResultsText={tAddr("noResults")}
              wrapperClassName="flex-1"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deletingAddress !== null}
        onClose={closeDeleteModal}
        title={tAddr("deleteTitle")}
        size="sm"
        footer={deleteModalFooter}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{tAddr("deleteMessage")}</p>
          {deletingAddress && (
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <DeliveryAddress address={deletingAddress} />
            </div>
          )}
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
        </div>
      </Modal>
    </div>
  );
}
