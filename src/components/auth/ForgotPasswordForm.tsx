"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle } from "lucide-react";

export type ForgotPasswordFormData = {
  email: string;
};

type Props = {
  onSubmit: (data: ForgotPasswordFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onBackToSignIn?: () => void;
};

export function ForgotPasswordForm({
  onSubmit,
  isLoading,
  error,
  onBackToSignIn,
}: Props) {
  const t = useTranslations("auth");
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const handleFormSubmit = async (data: ForgotPasswordFormData) => {
    await onSubmit(data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="w-full text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center mb-4">
          <CheckCircle size={24} className="text-brand-secondary" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t("checkYourEmail")}</h2>
        <p className="text-sm text-gray-500 mb-6">{t("checkYourEmailSubtitle")}</p>
        {onBackToSignIn && (
          <button
            type="button"
            onClick={onBackToSignIn}
            className="text-sm text-brand-primary font-medium hover:underline"
          >
            {t("backToSignIn")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t("resetPassword")}</h2>
      <p className="text-sm text-gray-500 mb-6">{t("resetPasswordSubtitle")}</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("emailLabel")}
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            {...register("email", {
              required: t("emailRequired"),
              pattern: { value: /\S+@\S+\.\S+/, message: t("emailInvalid") },
            })}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-primary text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {t("sendResetInstructions")}
        </button>
      </form>

      {onBackToSignIn && (
        <p className="mt-5 text-center text-sm text-gray-500">
          <button
            type="button"
            onClick={onBackToSignIn}
            className="text-brand-primary font-medium hover:underline"
          >
            {t("backToSignIn")}
          </button>
        </p>
      )}
    </div>
  );
}
