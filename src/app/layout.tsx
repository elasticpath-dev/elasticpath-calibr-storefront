import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getTenantConfig, type ThemeConfig } from "@/lib/tenant-config";
import "./globals.css";

// Self-hosted — avoids the render-blocking cross-origin request to
// fonts.googleapis.com that Plasmic's own font loading would otherwise add
// (see skipFonts on PlasmicRootProvider in PlasmicContent.tsx).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getTenantConfig();
  return {
    title: {
      default: site.title,
      template: `%s | ${site.title}`,
    },
    description: site.description,
    icons: {
      icon: "/favicon.ico",
    },
  };
}

function buildThemeVars(theme: ThemeConfig): React.CSSProperties {
  return {
    "--color-brand-primary": theme.brandPrimary,
    "--color-brand-secondary": theme.brandSecondary,
    "--color-brand-accent": theme.brandAccent,
    "--color-brand-muted": theme.brandMuted,
    "--color-ink-900": theme.ink900,
    "--color-ink-800": theme.ink800,
    "--color-ink-700": theme.ink700,
    "--color-ink-600": theme.ink600,
    "--color-ink-400": theme.ink400,
    "--color-ink-300": theme.ink300,
    "--color-ink-200": theme.ink200,
    "--color-ink-100": theme.ink100,
    "--color-ink-50": theme.ink50,
    "--color-success-600": theme.success600,
    "--color-success-500": theme.success500,
    "--color-success-400": theme.success400,
    "--color-error-700": theme.error700,
    "--color-error-600": theme.error600,
    "--color-warning-600": theme.warning600,
  } as React.CSSProperties;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, ui } = await getTenantConfig();
  return (
    <html
      suppressHydrationWarning
      className={inter.variable}
      style={buildThemeVars(theme)}
      data-full-width={ui.fullWidth ? "true" : undefined}
    >
      <body suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
