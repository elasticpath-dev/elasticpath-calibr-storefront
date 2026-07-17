"use client";

export function readViewModeCookie(
  key: string,
  fallback: "list" | "grid",
): "list" | "grid" {
  if (typeof document === "undefined") return fallback;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
  const val = match?.[1];
  return val === "list" || val === "grid" ? val : fallback;
}

export function writeViewModeCookie(key: string, mode: "list" | "grid"): void {
  document.cookie = `${key}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
