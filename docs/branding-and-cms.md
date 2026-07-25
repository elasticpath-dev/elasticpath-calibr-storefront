# Branding & Content Management

What the storefront supports for visual customization and content management
without code changes.

- **Primary source files:** `src/lib/tenant-config.ts` (theme + cms),
  `src/app/[lang]/layout.tsx` (CSS custom properties), the Plasmic loader
  (`src/components/plasmic/*`, `plasmic-loader.ts`)

---

## Capabilities

### Branding
Entirely environment-variable driven — no code changes needed to rebrand:
- **Store identity** — name (header/checkout wordmark), browser-tab title, and meta description.
- **Colours** — 4 brand colours (primary, secondary, accent, muted), a 9-step neutral/ink scale, and 6 semantic colours (success/error/warning), all as hex values applied as CSS custom properties at the root of every page. Any colour left unset falls back to a built-in default, so partial branding is safe.
- **Logo** — a hard-coded SVG wordmark by default (using the brand primary colour), or a CMS-managed logo when the CMS integration is enabled and has one configured.

### Elastic Path CMS (Plasmic)
Optional visual content management for the homepage, footer, logo — and additional registered blocks (e.g. hero carousel, product carousel, navigation):
- Enabled by providing a CMS project ID and API token; disabled (falling back to the built-in hard-coded sections) if either is blank, or if a component fetch fails.
- **Preview mode** fetches the latest unpublished draft on every request — useful while designing, but slow, so it should stay off in production.
- With preview off, published CMS content is cached for ~5 minutes, so editorial changes appear within a few minutes without a redeploy while keeping page loads fast.
- A root-level catch-all renders Plasmic content by path (header/footer always; blank main when there's no matching Plasmic page — no 404).

---

## Configuration

| Env var | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_STORE_NAME` | string | `Calibr` | Wordmark. |
| `NEXT_PUBLIC_STORE_TITLE` | string | `<name> by Elasticpath` | Browser-tab / SEO title. |
| `NEXT_PUBLIC_STORE_DESCRIPTION` | string | `""` | SEO meta description. |
| `NEXT_PUBLIC_BRAND_PRIMARY` / `_SECONDARY` / `_ACCENT` / `_MUTED` | hex | see defaults | Brand colours (CSS vars). |
| `NEXT_PUBLIC_COLOR_INK_*` (900…50) | hex | see defaults | 9-step neutral scale. |
| `NEXT_PUBLIC_COLOR_SUCCESS_*` / `_ERROR_*` / `_WARNING_*` | hex | see defaults | Semantic colours. |
| `NEXT_PUBLIC_EP_CMS_PROJECT_ID` | string | `""` | Plasmic project id. Blank → CMS disabled. |
| `NEXT_PUBLIC_EP_CMS_API_TOKEN` | string | `""` | Plasmic API token. Blank → CMS disabled. |
| `NEXT_PUBLIC_EP_CMS_PREVIEW` | `true`/`false` | `false` | Fetch unpublished drafts on every request (design-time only). |
| `NEXT_PUBLIC_EP_CMS_HOST` | URL | EP default | Plasmic host. |

> Any unset colour falls back to a built-in default — partial branding is safe.
> CMS is enabled only when **both** the project id and API token are present.

---

## Behaviour scenarios (BDD)

```gherkin
Feature: Branding

  Scenario: Rebrand via env
    Given brand colours and store identity are set via env
    Then they apply as CSS custom properties site-wide with no code changes

  Scenario: Partial branding
    Given some colours are left unset
    Then those fall back to built-in defaults
```

```gherkin
Feature: CMS content

  Scenario: CMS enabled
    Given a Plasmic project id and API token are set
    Then homepage, footer, logo and registered blocks can be authored in Plasmic

  Scenario: CMS disabled or fetch fails
    Given the project id or token is blank (or a fetch fails)
    Then the built-in hard-coded sections render instead

  Scenario: Preview vs published
    # Switch: NEXT_PUBLIC_EP_CMS_PREVIEW
    Given preview is on
    Then the latest draft is fetched every request (slower)
    But with preview off, published content is cached ~5 minutes
```

---

## Quick reference

| Want to… | Set |
|---|---|
| Set the store name/title | `NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_STORE_TITLE` |
| Set brand colours | `NEXT_PUBLIC_BRAND_PRIMARY=273a60`, … |
| Enable CMS content | `NEXT_PUBLIC_EP_CMS_PROJECT_ID` + `NEXT_PUBLIC_EP_CMS_API_TOKEN` |
| Preview drafts while designing | `NEXT_PUBLIC_EP_CMS_PREVIEW=true` (turn off in production) |

**Related:** [localization.md](localization.md)
