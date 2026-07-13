"use client";

import { useState, useId, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Send,
  Lock,
  Info,
  ShoppingBag,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { useAuth } from "@/context/AuthContext";
import { useAccountAddresses, type NewAddressFields } from "@/hooks/use-account-addresses";
import { createEpClient } from "@/lib/api/ep-client";
import { createQuote, bulkAddQuoteItems, type QuoteItemPayload } from "@/lib/api/quotes";
import { DeliveryAddress } from "@/components/checkout/shipping/DeliveryAddress";
import { Select } from "@/components/ui/Select";
import { CheckoutUserInfo } from "@/components/checkout/CheckoutUserInfo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { COUNTRIES } from "@/lib/countries";

type Step = "details" | "review" | "success";

type FormState = {
  company: string;
  contact: string;
  email: string;
  po: string;
  date: string;
  urgency: "standard" | "urgent";
  terms: "net30" | "net60" | "net90" | "prepay" | "";
  target: string;
  volume: string;
  notes: string;
};

function generateRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "QR-";
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

export function QuoteRequestFlow({
  lang,
  logo,
}: {
  lang: string;
  logo?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("quote");
  const tAddr = useTranslations("address");
  const { storeName } = useTenantConfig();
  const { items, cartTotal, clearCart } = useCart();
  const { credentials, selectedAccount } = useAuth();
  const { addresses, isLoading: addressesLoading, addAddress } = useAccountAddresses();
  const formId = useId();

  const STEPS: Array<{ key: Step; num: string; label: string }> = [
    { key: "details", num: "1", label: t("step1Label") },
    { key: "review",  num: "2", label: t("step2Label") },
    { key: "success", num: "3", label: t("step3Label") },
  ];

  const TERMS_OPTIONS: Array<{ value: "net30" | "net60" | "net90" | "prepay"; label: string }> = [
    { value: "net30",   label: t("net30") },
    { value: "net60",   label: t("net60") },
    { value: "net90",   label: t("net90") },
    { value: "prepay",  label: t("prepay") },
  ];

  const TIMELINE = [
    { label: t("timeline1"), sub: t("timeline1Sub"), done: true  },
    { label: t("timeline2"), sub: t("timeline2Sub"), done: false },
    { label: t("timeline3"), sub: t("timeline3Sub"), done: false },
    { label: t("timeline4"), sub: t("timeline4Sub"), done: false },
  ];

  const [step, setStep] = useState<Step>("details");
  const [showErrors, setShowErrors] = useState(false);
  const [acked, setAcked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ref] = useState(generateRef);
  const [submittedDate] = useState(() =>
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
  );

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
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
        setSelectedAddressId(created.id);
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

  const [form, setForm] = useState<FormState>({
    company: "",
    contact: "",
    email: "",
    po: "",
    date: "",
    urgency: "standard",
    terms: "net30",
    target: "",
    volume: "",
    notes: "",
  });

  useEffect(() => {
    if (!credentials) return;
    setForm((f) => ({
      ...f,
      contact: f.contact || credentials.member_name || "",
      email: f.email || credentials.member_email || "",
      company: f.company || selectedAccount?.account_name || "",
    }));
  }, [credentials, selectedAccount]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const lineCount = items.length;
  const canContinue = !!(
    form.company.trim() &&
    form.contact.trim() &&
    form.email.trim() &&
    selectedAddressId &&
    selectedAddressId !== "__new__"
  );

  async function handleSubmit() {
    if (!acked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const client = createEpClient();
      const addr = addresses.find((a) => a.id === selectedAddressId);

      const addressValue = addr
        ? [addr.line_1, addr.line_2, addr.city, addr.county, addr.postcode, addr.country]
            .filter(Boolean)
            .join(", ")
        : undefined;

      const requestedDateValue = form.date
        ? (() => {
            const [y, m, d] = form.date.split("-");
            return `${d}/${m}/${y}`;
          })()
        : undefined;

      const customAttributes: Record<string, { type: "string"; value: string }> = {};
      if (addressValue)        customAttributes.address        = { type: "string", value: addressValue };
      if (form.terms)          customAttributes.payment_term   = { type: "string", value: form.terms };
      if (requestedDateValue)  customAttributes.requested_date = { type: "string", value: requestedDateValue };
      if (form.contact)        customAttributes.buyer_name     = { type: "string", value: form.contact };
      if (form.email)          customAttributes.buyer_email    = { type: "string", value: form.email };
      if (form.po)             customAttributes.po_reference   = { type: "string", value: form.po };
      if (form.target)         customAttributes.target_price   = { type: "string", value: form.target };
      if (form.volume)         customAttributes.annual_volume  = { type: "string", value: form.volume };
      if (form.notes)          customAttributes.notes          = { type: "string", value: form.notes };

      const quoteRes = await createQuote({
        client,
        body: {
          data: {
            type: "quote",
            name: ref,
            custom_attributes: Object.keys(customAttributes).length > 0 ? customAttributes : undefined,
          },
        },
      });

      const quoteId = (quoteRes.data as any)?.data?.id;
      if (!quoteId) throw new Error("Quote creation failed — no ID returned.");

      if (items.length > 0) {
        await bulkAddQuoteItems({
          client,
          path: { quoteId },
          body: {
            data: items.map((item): QuoteItemPayload => {
              if (item.isSubscription && item.subscriptionOfferingId && item.subscriptionConfiguration) {
                return {
                  type: "subscription_item" as const,
                  id: item.subscriptionOfferingId,
                  quantity: item.quantity,
                  subscription_configuration: item.subscriptionConfiguration,
                  ...(item.customInputs && Object.keys(item.customInputs).length > 0
                    ? { custom_inputs: item.customInputs }
                    : {}),
                };
              }
              if (item.isCustomItem) {
                return {
                  type: "custom_item" as const,
                  name: item.name,
                  sku: item.sku ?? "",
                  quantity: item.quantity,
                  price: { amount: item.unitPriceAmount, includes_tax: true },
                  ...(item.customInputs && Object.keys(item.customInputs).length > 0
                    ? { custom_inputs: item.customInputs }
                    : {}),
                };
              }
              return {
                type: "quote_item" as const,
                id: item.productId,
                quantity: item.quantity,
                ...(item.customInputs && Object.keys(item.customInputs).length > 0
                  ? { custom_inputs: item.customInputs }
                  : {}),
              };
            }),
          },
        });
      }

      await clearCart();
      setStep("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("submitError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const toggleLabelCls = "block text-[12px] font-semibold text-ink-700 mb-[7px]";

  /* ── Stepper ── */
  function Stepper() {
    return (
      <div className="flex items-center justify-center">
        {STEPS.map((st, i) => {
          const isPast =
            (st.key === "details" && (step === "review" || step === "success")) ||
            (st.key === "review" && step === "success");
          const isActive = st.key === step;
          const isLast = i === STEPS.length - 1;
          return (
            <div key={st.key} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                    isPast
                      ? "bg-brand-primary text-white"
                      : isActive
                        ? "bg-brand-primary text-white ring-2 ring-offset-2 ring-brand-primary"
                        : "bg-ink-200 text-ink-600",
                  ].join(" ")}
                >
                  {isPast ? <Check size={14} /> : st.num}
                </span>
                <span
                  className={[
                    "text-sm font-medium",
                    isActive ? "text-ink-900" : isPast ? "text-brand-primary" : "text-ink-400",
                  ].join(" ")}
                >
                  {st.label}
                </span>
              </div>
              {!isLast && (
                <span className={["w-10 h-px mx-1", isPast ? "bg-brand-primary" : "bg-ink-200"].join(" ")} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Page header ── */
  const pageHeader = (
    <header className="flex-none border-b border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-14 py-2 grid grid-cols-3 items-center">
        <div className="flex items-center">
          {logo ?? (
            <a href={`/${lang}`} aria-label={t("returnToStore")} className="flex items-center gap-2">
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="var(--color-brand-primary)" />
                <path d="M8 10h16M8 16h10M8 22h13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span className="text-lg font-bold tracking-tight text-gray-900">{storeName}</span>
            </a>
          )}
        </div>
        <div className="flex justify-center">
          <Stepper />
        </div>
        <div className="flex items-center justify-end">
          <CheckoutUserInfo />
        </div>
      </div>
    </header>
  );

  /* ── Shared edit button ── */
  const EditButton = ({ onClick }: { onClick: () => void }) => (
    <Button
      variant="ghost"
      size="sm"
      className="text-success-500 hover:text-success-500 hover:bg-success-50"
      leftIcon={<Pencil size={13} />}
      onClick={onClick}
    >
      {t("edit")}
    </Button>
  );

  /* ── Section mono-label ── */
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="font-mono text-[10px] tracking-[.12em] uppercase text-ink-600 mb-[14px]">
      {children}
    </p>
  );

  /* ── Items list ── */
  function ItemsList({ editable = false }: { editable?: boolean }) {
    return (
      <Card className="rounded-2xl border-ink-200 shadow-none">
        <CardHeader className="border-ink-100 py-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[15px] text-ink-900">{t("itemsTitle")}</p>
            <div className="flex items-center gap-3">
              <p className="text-[13px] text-ink-600">
                {totalUnits} unit{totalUnits !== 1 ? "s" : ""} · {lineCount} product{lineCount !== 1 ? "s" : ""}
              </p>
              {editable && <EditButton onClick={() => setStep("details")} />}
            </div>
          </div>
        </CardHeader>

        {items.length === 0 ? (
          <CardBody className="flex flex-col items-center gap-3 py-12 text-ink-400">
            <ShoppingBag size={32} />
            <p className="text-sm">{t("noItemsInCart")}</p>
          </CardBody>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3.5 px-5 py-[13px] border-b border-ink-100 last:border-b-0"
            >
              <span className="w-[38px] h-[38px] rounded-[9px] bg-ink-100 flex items-center justify-center flex-none overflow-hidden">
                {item.imageHref ? (
                  <img src={item.imageHref} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag size={19} className="text-ink-600" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] text-ink-900">{item.name}</p>
                <p className="text-[12px] text-ink-600 font-mono mt-0.5">
                  {item.sku} · {item.quantity} unit{item.quantity !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[14px] text-ink-900">{item.lineTotalFormatted}</p>
                <p className="text-[11px] text-ink-400">{t("listLabel")}</p>
              </div>
            </div>
          ))
        )}

        <div className="flex items-center gap-2.5 px-5 py-3 bg-success-50 text-success-600 text-[12.5px] font-medium">
          <Info size={15} className="flex-none" />
          {t("listPriceNote")}
        </div>
      </Card>
    );
  }

  /* ── STEP 1: DETAILS ── */
  const step1 = (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-6 items-start">
          {/* Main column */}
          <div className="flex-1 min-w-0 flex flex-col gap-[18px]">
            <ItemsList />

            {/* Company & contact */}
            <Card className="rounded-2xl border-ink-200 shadow-none">
              <CardBody>
                <SectionLabel>{t("companySectionTitle")}</SectionLabel>
                <div className="flex flex-col gap-[14px]">
                  <Input
                    label={t("companyLabel")}
                    id={`${formId}-company`}
                    value={form.company}
                    onChange={set("company")}
                    placeholder={t("companyPlaceholder")}
                    required
                    error={showErrors && !form.company.trim() ? t("errorCompany") : undefined}
                  />
                  <div className="flex gap-[14px]">
                    <Input
                      label={t("contactLabel")}
                      id={`${formId}-contact`}
                      wrapperClassName="flex-1"
                      value={form.contact}
                      onChange={set("contact")}
                      placeholder={t("contactPlaceholder")}
                      required
                      error={showErrors && !form.contact.trim() ? t("errorContact") : undefined}
                    />
                    <div className="flex-1" suppressHydrationWarning>
                      <Input
                        label={t("emailLabel")}
                        id={`${formId}-email`}
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        placeholder={t("emailPlaceholder")}
                        suppressHydrationWarning
                        required
                        error={showErrors && !form.email.trim() ? t("errorEmail") : undefined}
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Delivery */}
            <Card className="rounded-2xl border-ink-200 shadow-none">
              <CardBody>
                <SectionLabel>{t("deliverySectionTitle")}</SectionLabel>
                <div className="flex flex-col gap-3">
                  <Select
                    label={t("shipToLabel")}
                    placeholder={t("selectAddress")}
                    disabled={addressesLoading}
                    value={selectedAddressId}
                    required
                    error={showErrors && !selectedAddressId ? t("errorShipTo") : undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__new__") {
                        openAddressModal();
                      } else {
                        setSelectedAddressId(val);
                      }
                    }}
                    options={[
                      ...addresses.map((addr) => ({
                        value: addr.id ?? "",
                        label: [
                          [addr.first_name, addr.last_name].filter(Boolean).join(" "),
                          [addr.line_1, addr.city].filter(Boolean).join(", "),
                        ]
                          .filter(Boolean)
                          .join(" – "),
                      })),
                      { value: "__new__", label: t("createNewAddress") },
                    ]}
                  />
                  {selectedAddressId && (() => {
                    const addr = addresses.find((a) => a.id === selectedAddressId);
                    return addr ? (
                      <Card className="rounded-xl border-ink-200 shadow-none">
                        <CardBody className="py-3">
                          <DeliveryAddress address={addr} />
                        </CardBody>
                      </Card>
                    ) : null;
                  })()}
                  <Input
                    label={t("deliveryDateLabel")}
                    id={`${formId}-date`}
                    type="date"
                    wrapperClassName="flex-1 min-w-[180px]"
                    value={form.date}
                    onChange={set("date")}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Commercial terms */}
            <Card className="rounded-2xl border-ink-200 shadow-none">
              <CardBody>
                <SectionLabel>{t("commercialSectionTitle")}</SectionLabel>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className={toggleLabelCls}>{t("paymentTermsLabel")}</label>
                    <div className="flex gap-2 flex-wrap">
                      {TERMS_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          variant="outline"
                          onClick={() => setForm((f) => ({ ...f, terms: opt.value }))}
                          className={
                            form.terms === opt.value
                              ? "border-success-400 bg-success-50 text-ink-900 hover:bg-success-50 hover:border-success-400 hover:opacity-100"
                              : "hover:opacity-100"
                          }
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-[14px] flex-wrap">
                    <Input
                      label={t("poLabel")}
                      id={`${formId}-po`}
                      wrapperClassName="flex-1 min-w-[200px]"
                      value={form.po}
                      onChange={set("po")}
                      className="font-mono"
                      placeholder={t("poPlaceholder")}
                    />
                    <Input
                      label={t("targetLabel")}
                      id={`${formId}-target`}
                      wrapperClassName="flex-1 min-w-[200px]"
                      value={form.target}
                      onChange={set("target")}
                      placeholder={t("targetPlaceholder")}
                    />
                    <Input
                      label={t("volumeLabel")}
                      id={`${formId}-volume`}
                      wrapperClassName="flex-1 min-w-[200px]"
                      value={form.volume}
                      onChange={set("volume")}
                      placeholder={t("volumePlaceholder")}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Notes */}
            <Card className="rounded-2xl border-ink-200 shadow-none">
              <CardBody>
                <SectionLabel>
                  {t("notesSectionTitle")}{" "}
                  <span className="normal-case tracking-normal text-ink-400">{t("notesOptional")}</span>
                </SectionLabel>
                <Textarea
                  id={`${formId}-notes`}
                  value={form.notes}
                  onChange={set("notes")}
                  rows={3}
                  placeholder={t("notesPlaceholder")}
                />
              </CardBody>
            </Card>
          </div>

          {/* Summary rail */}
          <div className="flex-none w-[300px] sticky top-8 flex flex-col gap-3">
            <Card className="rounded-2xl border-ink-200 shadow-none">
              <CardBody>
                <SectionLabel>{t("summaryTitle")}</SectionLabel>
                <div className="flex justify-between text-[13px] text-ink-700 py-1.5">
                  <span>{t("summaryProducts")}</span>
                  <span className="font-semibold text-ink-900">{lineCount}</span>
                </div>
                <div className="flex justify-between text-[13px] text-ink-700 py-1.5">
                  <span>{t("summaryTotalUnits")}</span>
                  <span className="font-semibold text-ink-900">{totalUnits}</span>
                </div>
                <div className="h-px bg-ink-100 my-2.5" />
                <div className="flex justify-between items-baseline py-1">
                  <span className="text-[13px] text-ink-600">{t("summaryListValue")}</span>
                  <span className="font-serif text-[24px] text-ink-900">{cartTotal}</span>
                </div>
                <div className="flex items-start gap-2 mt-3.5 p-3 rounded-[11px] bg-ink-50 text-[12px] text-ink-600 leading-relaxed">
                  <Lock size={14} className="flex-none mt-0.5 shrink-0" />
                  {t("summaryPricingNote")}
                </div>
              </CardBody>
            </Card>
            <Button
              fullWidth
              size="lg"
              variant="primary"
              rightIcon={<ArrowRight size={16} />}
              onClick={() => {
                setShowErrors(true);
                if (canContinue) setStep("review");
              }}
            >
              {t("continueToReview")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── STEP 2: REVIEW ── */
  const reviewRow = (label: string, value: string) => (
    <div className="bg-white px-5 py-[14px]">
      <p className="text-[11px] text-ink-600 mb-1">{label}</p>
      <p className="font-semibold text-[14px] text-ink-900">{value || "—"}</p>
    </div>
  );

  const termsLabel = TERMS_OPTIONS.find((opt) => opt.value === form.terms)?.label ?? form.terms;
  const dateLabel = form.date
    ? new Date(form.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  const step2 = (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-6 items-start">

          {/* Main column */}
          <div className="flex-1 min-w-0 flex flex-col gap-[18px]">
            <p className="font-serif text-[26px] tracking-tight text-ink-900">{t("reviewTitle")}</p>

            {/* Items recap */}
            <Card className="rounded-2xl border-ink-200 shadow-none">
              <CardHeader className="border-ink-100">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[14px] text-ink-900">{t("reviewItemsLabel", { units: totalUnits })}</p>
                  <EditButton onClick={() => setStep("details")} />
                </div>
              </CardHeader>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-[11px] border-b border-ink-100 last:border-b-0"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[14px] text-ink-900">{item.name}</span>{" "}
                    <span className="text-[12px] text-ink-600">
                      · {item.quantity} unit{item.quantity !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="font-bold text-[14px] text-ink-900 whitespace-nowrap">
                    {item.lineTotalFormatted}
                  </p>
                </div>
              ))}
            </Card>

            {/* Details recap */}
            <Card className="rounded-2xl border-ink-200 shadow-none">
              <CardHeader className="border-ink-100">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[14px] text-ink-900">{t("requestDetailsTitle")}</p>
                  <EditButton onClick={() => setStep("details")} />
                </div>
              </CardHeader>
              <div className="grid grid-cols-2 gap-px bg-ink-100">
                {reviewRow(t("reviewCompany"), form.company)}
                {reviewRow(t("reviewBuyer"), form.contact)}
                {reviewRow(t("reviewEmail"), form.email)}
                {reviewRow(t("reviewPo"), form.po)}
                {reviewRow(t("reviewDelivery"), dateLabel)}
                {reviewRow(t("reviewPaymentTerms"), termsLabel)}
                {reviewRow(t("reviewTargetPrice"), form.target || t("reviewNotSpecified"))}
              </div>
              {selectedAddressId && selectedAddressId !== "__new__" && (() => {
                const addr = addresses.find((a) => a.id === selectedAddressId);
                return addr ? (
                  <div className="px-5 py-[14px] border-t border-ink-100">
                    <p className="text-[11px] text-ink-600 mb-2">{t("reviewShipTo")}</p>
                    <DeliveryAddress address={addr} />
                  </div>
                ) : null;
              })()}
              {form.notes && (
                <div className="px-5 py-[14px] border-t border-ink-100">
                  <p className="text-[11px] text-ink-600 mb-1">{t("reviewNotes")}</p>
                  <p className="text-[14px] text-ink-800 leading-relaxed whitespace-pre-wrap">{form.notes}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Summary rail */}
          <div className="flex-none w-[300px] sticky top-8 flex flex-col gap-3">
            <Card className="rounded-2xl border-ink-200 shadow-none">
              <CardBody>
                <SectionLabel>{t("summaryTitle")}</SectionLabel>
                <div className="flex justify-between text-[13px] text-ink-700 py-1.5">
                  <span>{t("summaryProducts")}</span>
                  <span className="font-semibold text-ink-900">{lineCount}</span>
                </div>
                <div className="flex justify-between text-[13px] text-ink-700 py-1.5">
                  <span>{t("summaryTotalUnits")}</span>
                  <span className="font-semibold text-ink-900">{totalUnits}</span>
                </div>
                <div className="h-px bg-ink-100 my-2.5" />
                <div className="flex justify-between items-baseline py-1">
                  <span className="text-[13px] text-ink-600">{t("summaryListValue")}</span>
                  <span className="font-serif text-[24px] text-ink-900">{cartTotal}</span>
                </div>
                <div className="flex items-start gap-2 mt-3.5 p-3 rounded-[11px] bg-ink-50 text-[12px] text-ink-600 leading-relaxed">
                  <Lock size={14} className="flex-none mt-0.5 shrink-0" />
                  {t("summaryPricingNote")}
                </div>
              </CardBody>
            </Card>

            {/* Accept terms */}
            <Button
              fullWidth
              variant="outline"
              onClick={() => setAcked((a) => !a)}
              leftIcon={
                <span
                  className={[
                    "flex-none w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                    acked ? "bg-success-400 border-success-400 text-ink-900" : "border-ink-300 bg-white",
                  ].join(" ")}
                >
                  {acked && <Check size={11} strokeWidth={3} />}
                </span>
              }
              className={[
                "h-auto py-3 px-[14px] justify-start items-start whitespace-normal",
                acked
                  ? "border-success-400 bg-success-50 hover:bg-success-50 hover:border-success-400 hover:opacity-100"
                  : "hover:opacity-100",
              ].join(" ")}
            >
              <span className="text-[12.5px] text-ink-800 leading-relaxed font-normal text-left">
                {t("ackText")}
              </span>
            </Button>

            <Button
              fullWidth
              size="lg"
              variant="primary"
              disabled={!acked || isSubmitting}
              isLoading={isSubmitting}
              rightIcon={!isSubmitting ? <Send size={16} /> : undefined}
              onClick={handleSubmit}
            >
              {t("submitButton")}
            </Button>
            <Button
              fullWidth
              size="lg"
              variant="outline"
              leftIcon={<ArrowLeft size={16} />}
              onClick={() => setStep("details")}
            >
              {t("back")}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );

  /* ── STEP 3: SUCCESS ── */
  const step3 = (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[560px] mx-auto px-10 py-12 flex flex-col items-center text-center">
        <div className="w-[72px] h-[72px] rounded-full bg-success-50 border border-success-200 flex items-center justify-center text-success-500">
          <Check size={36} />
        </div>

        <h2 className="font-serif font-medium text-[32px] tracking-tight text-ink-900 mt-6 mb-0">
          {t("successTitle")}
        </h2>
        <p className="text-[15px] text-ink-700 leading-relaxed mt-3 max-w-[42ch]">
          {t("successMessagePrefix")}{" "}
          <strong className="text-ink-900">{form.email}</strong>.
        </p>

        <div className="inline-flex items-center gap-2.5 mt-6 px-[18px] py-[11px] rounded-full bg-ink-900 text-white">
          <span className="font-mono text-[10px] tracking-[.12em] uppercase text-[#61DEA6]">{t("successRefLabel")}</span>
          <span className="font-mono font-bold text-[15px] tracking-[.04em]">{ref}</span>
        </div>

        <div className="flex w-full mt-6 border border-ink-200 rounded-[14px] overflow-hidden bg-white">
          <div className="flex-1 px-3 py-[15px] border-r border-ink-100">
            <p className="text-[11px] text-ink-600">{t("successSubmitted")}</p>
            <p className="font-semibold text-[14px] text-ink-900 mt-0.5">{submittedDate}</p>
          </div>
          <div className="flex-1 px-3 py-[15px] border-r border-ink-100">
            <p className="text-[11px] text-ink-600">{t("successUnits")}</p>
            <p className="font-semibold text-[14px] text-ink-900 mt-0.5">{totalUnits}</p>
          </div>
          <div className="flex-1 px-3 py-[15px]">
            <p className="text-[11px] text-ink-600">{t("successListValue")}</p>
            <p className="font-semibold text-[14px] text-ink-900 mt-0.5">{cartTotal}</p>
          </div>
        </div>

        <Card className="w-full mt-6 rounded-2xl border-ink-200 shadow-none text-left">
          <CardBody>
            <SectionLabel>{t("whatHappensNext")}</SectionLabel>
            {TIMELINE.map((item, i) => (
              <div key={i} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span
                    className={[
                      "w-[26px] h-[26px] rounded-full flex items-center justify-center flex-none text-sm font-bold",
                      item.done ? "bg-success-400 text-ink-900" : "bg-ink-100 text-ink-400",
                    ].join(" ")}
                  >
                    {item.done ? <Check size={13} /> : i + 1}
                  </span>
                  {i < TIMELINE.length - 1 && <span className="w-px flex-1 bg-ink-100 my-1" />}
                </div>
                <div className={i < TIMELINE.length - 1 ? "pb-4" : ""}>
                  <p className={["text-[14px] font-semibold", item.done ? "text-ink-900" : "text-ink-600"].join(" ")}>
                    {item.label}
                  </p>
                  <p className="text-[12.5px] text-ink-600 mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="flex gap-3 mt-7">
          <Button
            size="lg"
            variant="primary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => router.push(`/${lang}/cart`)}
          >
            {t("backToCart")}
          </Button>
        </div>
      </div>
    </div>
  );

  const addressModalFooter = (
    <>
      <Button variant="outline" onClick={() => setIsAddressModalOpen(false)} disabled={addressSaving}>
        {tAddr("cancel")}
      </Button>
      <Button
        variant="primary"
        onClick={handleAddAddress}
        disabled={addressSaving}
      >
        {addressSaving ? tAddr("adding") : tAddr("addButton")}
      </Button>
    </>
  );

  return (
    <div className="h-screen bg-ink-100 flex flex-col">
      {pageHeader}
      {step === "details" && step1}
      {step === "review" && step2}
      {step === "success" && step3}

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
    </div>
  );
}
