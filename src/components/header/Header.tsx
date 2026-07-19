import { Logo } from "./Logo";
import { NavBar } from "./navigation/NavBar";
import { MobileNavBar } from "./navigation/MobileNavBar";
import { SearchButton } from "./search/SearchButton";
import { HeaderSearchBar } from "./search/HeaderSearchBar";
import { BulkOrderButton } from "./BulkOrderButton";
import { CartButton } from "./cart/CartButton";
import { AccountButton } from "./AccountButton";
import { SettingsButton } from "./SettingsButton";
import { getTenantConfig } from "@/lib/tenant-config";
import { getPlasmicConfig } from "@/lib/plasmic-config";
import { getPlasmicComponentData } from "@/components/plasmic/plasmic-data";
import PlasmicContent from "@/components/plasmic/PlasmicContent";

type HeaderProps = {
  lang: string;
};

export async function Header({ lang }: HeaderProps) {
  const [{ features, ui }, plasmicConfig] = await Promise.all([
    getTenantConfig(),
    getPlasmicConfig(),
  ]);

  // Nav data source (mirrors the Logo/Footer pattern): if the Plasmic
  // project contains a "navigation" component it drives the desktop nav;
  // otherwise the catalog-built NavBar renders. Layout (position) and
  // dropdown style always come from tenant config either way.
  const plasmicNavData = plasmicConfig.enabled
    ? await getPlasmicComponentData("navigation")
    : null;

  // Note: componentProps only reach the Studio-designed root component —
  // StorefrontNavigation resolves lang (from the URL) and navStyle (from
  // client tenant config) itself.
  const navSlot = plasmicNavData ? (
    <PlasmicContent
      component="navigation"
      prefetchedData={plasmicNavData}
      componentProps={{ lang }}
    />
  ) : (
    <NavBar lang={lang} navStyle={ui.navStyle} />
  );

  const navBelow =
    ui.headerNavPosition === "below" || ui.headerNavPosition === "below-center";

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 supports-[backdrop-filter]:bg-white/80">
      <div className="container-shell px-4 sm:px-6 lg:px-8">
        <div className="flex items-center min-h-16 py-2 gap-4">
          {/* Mobile: hamburger — mirrors the Plasmic nav when it drives desktop */}
          <MobileNavBar lang={lang} hasPlasmicNav={!!plasmicNavData} />

          {/* Logo */}
          <Logo lang={lang} />

          {/* Desktop: center nav (inline position only) */}
          {!navBelow && (
            <div className="hidden lg:flex flex-1 justify-center">{navSlot}</div>
          )}

          {/* Spacer: always on mobile; also on desktop when nav is on its own row */}
          <div
            className={navBelow ? "flex-1" : "flex-1 lg:hidden"}
            aria-hidden="true"
          />

          {/* Right: search + account + cart + settings */}
          <div className="flex items-center gap-1">
            {features.searchEnabled &&
              (navBelow ? (
                <>
                  {/* Below mode: inline search bar with live results next to
                      the account button (desktop); icon stays for mobile */}
                  <div className="hidden lg:block mr-2">
                    <HeaderSearchBar lang={lang} />
                  </div>
                  <span className="lg:hidden">
                    <SearchButton lang={lang} />
                  </span>
                </>
              ) : (
                <SearchButton lang={lang} />
              ))}
            {features.bulkOrderEnabled && <BulkOrderButton lang={lang} />}
            <AccountButton />
            <CartButton />
            <SettingsButton />
          </div>
        </div>

        {/* Desktop: nav on its own row below the logo row — left-aligned for
            "below", centered for "below-center" */}
        {navBelow && (
          <div
            className={`hidden lg:flex ${
              ui.headerNavPosition === "below-center"
                ? "justify-center"
                : "justify-start"
            }`}
          >
            {navSlot}
          </div>
        )}
      </div>
    </header>
  );
}
