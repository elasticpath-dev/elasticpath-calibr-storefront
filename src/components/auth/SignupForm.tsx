"use client";

import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export type SignupFormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type Props = {
  onSubmit: (data: SignupFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onSignIn?: () => void;
};

export function SignupForm({ onSubmit, isLoading, error, onSignIn }: Props) {
  const t = useTranslations("auth");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>();

  const password = watch("password");

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t("joinUsTitle")}</h2>
      <p className="text-sm text-gray-500 mb-6">{t("joinUsSubtitle")}</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="signup-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("fullNameLabel")}
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            {...register("name", { required: t("nameRequired") })}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("emailLabel")}
          </label>
          <input
            id="signup-email"
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

        <div>
          <label
            htmlFor="signup-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("passwordLabel")}
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            {...register("password", {
              required: t("passwordRequired"),
              minLength: { value: 8, message: t("passwordTooShort") },
            })}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-confirm-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("confirmPasswordLabel")}
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            {...register("confirmPassword", {
              required: t("confirmPasswordRequired"),
              validate: (v) => v === password || t("passwordMismatch"),
            })}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-primary text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {t("createAccountButton")}
        </button>
      </form>

      {onSignIn && (
        <p className="mt-5 text-center text-sm text-gray-500">
          {t("hasAccountPrompt")}{" "}
          <button
            type="button"
            onClick={onSignIn}
            className="text-brand-primary font-medium hover:underline"
          >
            {t("signIn")}
          </button>
        </p>
      )}
    </div>
  );
}
