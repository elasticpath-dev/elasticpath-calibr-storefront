"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTenantConfig } from "@/lib/tenant-config";

const GATE_COOKIE = "ep_gatekeeper";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function submitPassword(formData: FormData) {
  const entered = (formData.get("password") as string | null)?.trim() ?? "";
  const { security } = await getTenantConfig();
  const stored = security.gatekeeperPassword;
  const from = (formData.get("from") as string | null) ?? "/";

  if (!entered || entered !== stored) {
    redirect(`/gate?from=${encodeURIComponent(from)}&error=1`);
  }

  const jar = await cookies();
  jar.set(GATE_COOKIE, "granted", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  redirect(from.startsWith("/") ? from : "/");
}
