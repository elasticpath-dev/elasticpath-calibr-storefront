/**
 * Lightweight HTML sanitizer for merchant-authored product descriptions.
 *
 * Product descriptions come from Elastic Path (merchant-controlled, semi-trusted
 * content) and may contain formatting markup. This strips the dangerous bits —
 * scripts, styles, iframes/embeds, inline event handlers, and
 * javascript:/vbscript:/data: URLs — while leaving common formatting intact, so
 * the HTML can be rendered with dangerouslySetInnerHTML.
 *
 * It runs in both server and client components (no DOM dependency). It is NOT a
 * full HTML parser: if descriptions ever carry untrusted/user-generated HTML,
 * swap this for a vetted sanitizer such as DOMPurify or sanitize-html.
 */

// Elements removed entirely, including their contents.
const BLOCKED_ELEMENTS =
  /<\s*(script|style|iframe|object|embed|form|link|meta|base|template|noscript)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;

// Opening/void forms of the same blocked elements (e.g. an unclosed <script>).
const BLOCKED_OPEN_TAGS =
  /<\s*(script|style|iframe|object|embed|form|link|meta|base|template|noscript)\b[^>]*>/gi;

// Inline event-handler attributes: onclick=, onerror=, onload=, …
const EVENT_HANDLERS = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

// Dangerous URL schemes in href/src/xlink:href.
const DANGEROUS_URLS =
  /\b(href|src|xlink:href)\s*=\s*("|')\s*(?:javascript|vbscript|data)\s*:[^"']*\2/gi;

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(BLOCKED_ELEMENTS, "")
    .replace(BLOCKED_OPEN_TAGS, "")
    .replace(EVENT_HANDLERS, "")
    .replace(DANGEROUS_URLS, '$1=$2#$2');
}
