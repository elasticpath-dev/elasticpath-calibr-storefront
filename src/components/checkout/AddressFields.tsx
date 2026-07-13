"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input/Input";
import type { UseFormRegister, FieldErrors, Path } from "react-hook-form";
import type { CheckoutFormData } from "@/hooks/use-checkout";

type AddressPrefix = "shippingAddress" | "billingAddress";

type Props = {
  prefix: AddressPrefix;
  register: UseFormRegister<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
};

export function AddressFields({ prefix, register, errors }: Props) {
  const t = useTranslations("address");

  const field = <K extends string>(name: K) =>
    `${prefix}.${name}` as Path<CheckoutFormData>;

  const err = (name: string) => {
    const section = errors[prefix] as Record<string, { message?: string }> | undefined;
    return section?.[name]?.message;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input
          label={t("line1")}
          placeholder={t("line1Placeholder")}
          required
          error={err("line1")}
          {...register(field("line1"), { required: t("line1Required") })}
        />
      </div>
      <div className="sm:col-span-2">
        <Input
          label={t("line2")}
          placeholder={t("line2Placeholder")}
          {...register(field("line2"))}
        />
      </div>
      <Input
        label={t("city")}
        placeholder={t("cityPlaceholder")}
        required
        error={err("city")}
        {...register(field("city"), { required: t("cityRequired") })}
      />
      <Input
        label={t("postcode")}
        placeholder={t("postcodePlaceholder")}
        required
        error={err("postcode")}
        {...register(field("postcode"), { required: t("postcodeRequired") })}
      />
      <Input
        label={t("county")}
        placeholder={t("countyPlaceholder")}
        {...register(field("county"))}
      />
      <Input
        label={t("country")}
        placeholder={t("countryPlaceholder")}
        required
        error={err("country")}
        {...register(field("country"), { required: t("countryRequired") })}
      />
    </div>
  );
}
