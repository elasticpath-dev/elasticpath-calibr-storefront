import Link from "next/link";
import Image from "next/image";

type LinkItem = { label: string; href: string };

export type FooterColumn = { heading: string; links?: LinkItem[] };

type StorefrontFooterProps = {
  lang: string;
  logoUrl?: string;
  logoAlt?: string;
  tagline?: string;
  columns?: FooterColumn[];
  copyrightText?: string;
  privacyPolicyLabel?: string;
  privacyPolicyHref?: string;
  termsLabel?: string;
  termsHref?: string;
  className?: string;
};

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    heading: "Shop",
    links: [
      { label: "All Products", href: "/category" },
      { label: "Featured", href: "/" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "My Account", href: "/account" },
      { label: "Order History", href: "/account" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/" },
      { label: "Contact", href: "/" },
    ],
  },
];

export function StorefrontFooter({
  lang,
  logoUrl = "/logo.png",
  logoAlt = "Elastic Path",
  tagline = "API-first composable commerce built for enterprise brands with complex requirements.",
  columns = DEFAULT_COLUMNS,
  copyrightText,
  privacyPolicyLabel = "Privacy Policy",
  privacyPolicyHref = "/",
  termsLabel = "Terms of Service",
  termsHref = "/",
  className,
}: StorefrontFooterProps) {
  const year = new Date().getFullYear();
  const copyright =
    copyrightText ??
    `© ${year} Elastic Path Commerce Inc. All rights reserved.`;

  return (
    <footer
      className={`border-t border-gray-200 mt-16 bg-white text-gray-600${className ? ` ${className}` : ""}`}
    >
      <div className="container-shell px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-10"
          style={{
            gridTemplateColumns: `1fr repeat(${columns.length}, minmax(0, 1fr))`,
          }}
        >
          {/* Brand */}
          <div>
            <Link href={`/${lang}`}>
              <Image src={logoUrl} alt={logoAlt} width={120} height={28} />
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              {tagline}
            </p>
          </div>

          {/* Dynamic columns */}
          {columns.map((col, colIdx) => (
            <div key={colIdx}>
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">
                {col.heading}
              </h3>
              <ul className="space-y-3">
                {(col.links ?? []).map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link
                      href={`/${lang}${link.href}`}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">{copyright}</p>
          <div className="flex items-center gap-6">
            <Link
              href={privacyPolicyHref}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              {privacyPolicyLabel}
            </Link>
            <Link
              href={termsHref}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              {termsLabel}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
