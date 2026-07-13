"use client";

import { useAuth } from "@/context/AuthContext";

export function CheckoutUserInfo() {
  const { isAuthenticated, credentials } = useAuth();
  if (!isAuthenticated || !credentials) return null;

  const initials = (credentials.member_name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-white leading-none">{initials}</span>
      </div>

      {/* Name + email */}
      <div className="text-left leading-tight hidden sm:block">
        <p className="text-sm font-semibold text-gray-900">
          {credentials.member_name}
        </p>
        <p className="text-xs text-gray-400">
          {credentials.member_email}
        </p>
      </div>
    </div>
  );
}
