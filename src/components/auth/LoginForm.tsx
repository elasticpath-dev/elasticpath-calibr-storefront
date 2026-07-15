"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useOidcProfiles } from "@/context/OidcProfilesContext";
import { generateOidcLoginRedirectUrl } from "@/lib/oidc-utils";

export type LoginFormData = {
  email: string;
  password: string;
};

type Props = {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
};

export function LoginForm({
  onSubmit,
  isLoading,
  error,
  onForgotPassword,
  onSignUp,
}: Props) {
  const t = useTranslations("auth");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();
  const oidcProfiles = useOidcProfiles();
  const pathname = usePathname();
  const [oidcLoadingId, setOidcLoadingId] = useState<string | null>(null);

  async function handleOidcLogin(profileId: string, clientId: string, authorizationEndpoint: string) {
    setOidcLoadingId(profileId);
    try {
      const url = await generateOidcLoginRedirectUrl(
        authorizationEndpoint,
        clientId,
        pathname,
      );
      window.location.href = url;
    } catch {
      setOidcLoadingId(null);
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t("welcomeBack")}</h2>
      <p className="text-sm text-gray-500 mb-6">{t("welcomeBackSubtitle")}</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("emailLabel")}
          </label>
          <input
            id="login-email"
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
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700"
            >
              {t("passwordLabel")}
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-brand-primary hover:underline"
              >
                {t("forgotPassword")}
              </button>
            )}
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            {...register("password", { required: t("passwordRequired") })}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-primary text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {t("signInButton")}
        </button>
      </form>

      {oidcProfiles.length > 0 && (
        <div className="mt-5">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="mx-3 text-xs text-gray-400 whitespace-nowrap">
              {t("orContinueWith")}
            </span>
            <div className="flex-grow border-t border-gray-200" />
          </div>
          <div className="flex flex-col gap-2 mt-4">
            {oidcProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                disabled={oidcLoadingId !== null}
                onClick={() => handleOidcLogin(profile.id, profile.clientId, profile.authorizationEndpoint)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {oidcLoadingId === profile.id && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {profile.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {onSignUp && (
        <p className="mt-5 text-center text-sm text-gray-500">
          {t("noAccountPrompt")}{" "}
          <button
            type="button"
            onClick={onSignUp}
            className="text-brand-primary font-medium hover:underline"
          >
            {t("createAccount")}
          </button>
        </p>
      )}
    </div>
  );
}
