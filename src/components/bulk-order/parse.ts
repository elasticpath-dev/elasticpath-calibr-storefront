export type BulkLine = { sku: string; quantity: number };

/**
 * Parses "SKU,quantity" lines (one per line) into cart line items. Blank
 * lines and lines without a positive quantity are dropped. Tolerates extra
 * whitespace and an optional trailing header row is the caller's concern.
 */
export function parseSkuLines(text: string): BulkLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sku, qty] = line.split(",");
      return { sku: (sku ?? "").trim(), quantity: Number((qty ?? "").trim()) };
    })
    .filter((item) => item.sku && Number.isFinite(item.quantity) && item.quantity > 0);
}

/**
 * Normalizes an uploaded CSV/TXT file's contents to "sku,quantity" lines for
 * the textarea: keeps the first two comma-separated columns and drops a
 * leading header row when its first cell isn't a plausible quantity (i.e. it
 * looks like a "sku" header).
 */
export function csvToSkuLines(raw: string): string {
  const rows = raw
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split(",").map((c) => c.trim()));

  if (rows.length === 0) return "";

  // Drop a header row like "sku,quantity" (second cell is not a number).
  const [first] = rows;
  const looksLikeHeader =
    first.length >= 2 && Number.isNaN(Number(first[1]));
  const body = looksLikeHeader ? rows.slice(1) : rows;

  return body
    .filter((cols) => cols[0])
    .map((cols) => `${cols[0]},${cols[1] ?? ""}`)
    .join("\n");
}

export const BULK_ORDER_TEMPLATE = "sku,quantity\nSKU001,10\nSKU002,20\n";

/** Triggers a client-side download of a text blob (no file-saver needed). */
export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
