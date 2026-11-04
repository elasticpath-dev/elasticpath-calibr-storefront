const NUMBER_TOKEN = /\d[\d.,  ' ]*\d|\d/;

/**
 * Formats a minor-unit `amount` using the exact format (symbol/suffix, separators,
 * decimals) of an API-provided `reference` string, e.g. "A$1,234.50" or
 * "24,600 Points". Only for amounts the API doesn't return pre-formatted
 * (derived sums/differences). No Intl/currency codes involved, so custom
 * currencies work. Returns `reference` unchanged if it can't be parsed.
 */
export function formatLike(reference: string, amount: number): string {
  const cents = amount;
  if (!reference) return reference;
  const match = reference.match(NUMBER_TOKEN);
  if (!match) return reference;
  const token = match[0];

  const tail = token.match(/([.,])(\d+)$/);
  const decimals = tail ? tail[2].length : 0;
  // A trailing group of exactly 3 digits is ambiguous ("1,234"); treat it as grouping.
  const hasDecimal = !!tail && decimals !== 3;
  const decimalSep = hasDecimal && tail ? tail[1] : "";
  const fractionDigits = hasDecimal ? decimals : 0;
  const groupMatch = token.match(/[^\d.,]|[.,](?=\d{3}(?:\D|$))/);
  const groupSep = groupMatch && groupMatch[0] !== decimalSep ? groupMatch[0] : "";

  const abs = Math.abs(cents) / 10 ** fractionDigits;
  const [int, frac = ""] = abs.toFixed(fractionDigits).split(".");
  const grouped = groupSep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep) : int;
  const num = fractionDigits ? `${grouped}${decimalSep}${frac}` : grouped;
  const out = reference.replace(token, num);
  return cents < 0 && !out.includes("-") ? `-${out}` : out;
}
