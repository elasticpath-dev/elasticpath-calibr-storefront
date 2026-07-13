import { Logo } from "./Logo";
import { NavBar } from "./navigation/NavBar";
import { MobileNavBar } from "./navigation/MobileNavBar";
import { SearchButton } from "./search/SearchButton";
import { CartButton } from "./cart/CartButton";
import { AccountButton } from "./AccountButton";
import { SettingsButton } from "./SettingsButton";
import { getTenantConfig } from "@/lib/tenant-config";

type HeaderProps = {
  lang: string;
};

export async function Header({ lang }: HeaderProps) {
  const { features } = await getTenantConfig();

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center min-h-16 py-2 gap-4">
          {/* Mobile: hamburger */}
          <MobileNavBar lang={lang} />

          {/* Logo */}
          <Logo lang={lang} />

          {/* Desktop: center nav */}
          <div className="hidden lg:flex flex-1 justify-center">
            <NavBar lang={lang} />
          </div>

          {/* Spacer for mobile */}
          <div className="flex-1 lg:hidden" aria-hidden="true" />

          {/* Right: locale + search + account + cart */}
          <div className="flex items-center gap-1">
            {features.searchEnabled && <SearchButton lang={lang} />}
            <AccountButton />
            <CartButton />
            <SettingsButton />
          </div>
        </div>
      </div>
    </header>
  );
}
