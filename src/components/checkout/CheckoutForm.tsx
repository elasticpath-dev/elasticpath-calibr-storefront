"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { useAuth } from "@/context/AuthContext";
import type { CheckoutFormData } from "@/hooks/use-checkout";
import type { AccountAddressResponse } from "@epcc-sdk/sdks-shopper";
import { AlertCircle, Lock } from "lucide-react";
import { ShippingGroupManager } from "./ShippingGroupManager";

type Props = {
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  savedAddresses?: AccountAddressResponse[];
  onShippingCostChange?: (cents: number, currency: string) => void;
};

export function CheckoutForm({
  onSubmit,
  isLoading,
  error,
  savedAddresses = [],
  onShippingCostChange,
}: Props) {
  const t = useTranslations("checkout");
  const { isAuthenticated, credentials } = useAuth();

  const [shippingReady, setShippingReady] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>();

  // Pre-fill contact from logged-in member
  useEffect(() => {
    if (!credentials) return;
    const [first = "", ...rest] = (credentials.member_name ?? "").split(" ");
    const last = rest.join(" ");
    if (first) setValue("firstName", first);
    if (last) setValue("lastName", last);
    if (credentials.member_email) setValue("email", credentials.member_email);
  }, [credentials, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {/* Contact fields — only shown to guests; authenticated users see their info in the header */}
      {!isAuthenticated && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t("firstName")}
            placeholder={t("firstNamePlaceholder")}
            required
            error={errors.firstName?.message}
            {...register("firstName", { required: t("firstNameRequired") })}
          />
          <Input
            label={t("lastName")}
            placeholder={t("lastNamePlaceholder")}
            required
            error={errors.lastName?.message}
            {...register("lastName", { required: t("lastNameRequired") })}
          />
          <div className="sm:col-span-2">
            <Input
              label={t("emailAddress")}
              type="email"
              placeholder={t("emailPlaceholder")}
              required
              error={errors.email?.message}
              {...register("email", {
                required: t("emailRequired"),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("emailInvalid"),
                },
              })}
            />
          </div>
          <Input
            label={t("phone")}
            type="tel"
            placeholder={t("phonePlaceholder")}
            {...register("phone")}
          />
          <Input
            label={t("company")}
            placeholder={t("companyPlaceholder")}
            {...register("company")}
          />
        </div>
      )}

      {/* Shipping method */}
      <ShippingGroupManager onReadyChange={setShippingReady} onShippingCostChange={onShippingCostChange} />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isLoading}
        disabled={!shippingReady}
        leftIcon={!isLoading ? <Lock size={16} /> : undefined}
      >
        {t("placeOrder")}
      </Button>

      {!shippingReady && (
        <p className="text-center text-xs text-amber-600">
          Assign all items to a shipment to place your order.
        </p>
      )}

      <p className="text-center text-xs text-gray-400">{t("securePayment")}</p>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
