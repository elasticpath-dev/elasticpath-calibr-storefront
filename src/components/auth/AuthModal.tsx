"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type AuthView = "login" | "signup" | "forgot-password";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthView;
};

export function AuthModal({ isOpen, onClose, initialView = "login" }: Props) {
  const [view, setView] = useState<AuthView>(initialView);
  const [mounted, setMounted] = useState(false);
  const { login, register, forgotPassword, isLoading, error, clearError } =
    useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      clearError();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialView, clearError]);

  const handleLogin = async (data: { email: string; password: string }) => {
    await login(data.email, data.password);
    onClose();
  };

  const handleSignup = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    await register(data.name, data.email, data.password);
    onClose();
  };

  const handleForgotPassword = async (data: { email: string }) => {
    await forgotPassword(data.email);
  };

  if (!isOpen || !mounted) return null;

  const modal = (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {view === "login" && (
            <LoginForm
              onSubmit={handleLogin}
              isLoading={isLoading}
              error={error}
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
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
