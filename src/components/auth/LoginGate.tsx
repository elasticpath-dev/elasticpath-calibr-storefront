"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type AuthView = "login" | "signup" | "forgot-password";

type Props = {
  /** Page the shopper was trying to reach before being gated — where we
   * send them once they're signed in. */
  from: string;
};

// Full-page counterpart to AuthModal, used on the /login-required gate
// (see proxy.ts) — same login/signup/forgot-password views, but redirecting
// to `from` on success instead of closing a modal over the current page.
export function LoginGate({ from }: Props) {
  const [view, setView] = useState<AuthView>("login");
  const router = useRouter();
  const { login, register, forgotPassword, isLoading, error, clearError } =
    useAuth();

  const handleLogin = async (data: { email: string; password: string }) => {
    await login(data.email, data.password);
    router.replace(from);
  };

  const handleSignup = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    await register(data.name, data.email, data.password);
    router.replace(from);
  };

  const handleForgotPassword = async (data: { email: string }) => {
    await forgotPassword(data.email);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      {view === "login" && (
        <LoginForm
          onSubmit={handleLogin}
          isLoading={isLoading}
          error={error}
          returnPath={from}
          onForgotPassword={() => {
            clearError();
            setView("forgot-password");
          }}
          onSignUp={() => {
            clearError();
            setView("signup");
          }}
        />
      )}

      {view === "signup" && (
        <SignupForm
          onSubmit={handleSignup}
          isLoading={isLoading}
          error={error}
          onSignIn={() => {
            clearError();
            setView("login");
          }}
        />
      )}

      {view === "forgot-password" && (
        <ForgotPasswordForm
          onSubmit={handleForgotPassword}
          isLoading={isLoading}
          error={error}
          onBackToSignIn={() => {
            clearError();
            setView("login");
          }}
        />
      )}
    </div>
  );
}
