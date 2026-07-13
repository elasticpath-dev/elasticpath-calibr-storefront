# Branding & Content Management Functional Document

What the storefront supports for visual customization and content management without code changes.

## Branding

Entirely environment-variable driven — no code changes needed to rebrand:

- **Store identity** — name (header/checkout wordmark), browser-tab title, and meta description.
- **Colors** — 4 brand colors (primary, secondary, accent, muted), a 9-step neutral/ink scale, and 6 semantic colors (success/error/warning), all as hex values applied as CSS custom properties at the root of every page. Any color left unset falls back to a built-in default, so partial branding is safe.
- **Logo** — a hard-coded SVG wordmark by default (using the brand primary color), or a CMS-managed logo when the Elastic Path CMS integration (below) is enabled and has one configured.

## Elastic Path CMS (Plasmic)

Optional visual content management for the homepage, footer, and logo:

- Enabled by providing a CMS project ID and API token; disabled (and falling back to the storefront's built-in hard-coded sections) if either is left blank, or if a component fetch fails for any reason.
- **Preview mode** (`NEXT_PUBLIC_EP_CMS_PREVIEW`) fetches the latest unpublished draft on every request — useful while actively designing, but slow, so it should stay off in production.
- With preview off, published CMS content is cached for 5 minutes, so editorial changes appear within a few minutes without a redeploy, while keeping normal page loads fast.

## Related documents

- [localization.md](localization.md) — language and currency, the other major cross-cutting customization surface
