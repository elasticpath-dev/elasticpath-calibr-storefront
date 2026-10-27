/**
 * Pulls the human-readable message out of an Elastic Path error body:
 *   { "errors": [{ "status": 400, "title": "Bad Request", "detail": "…" }] }
 * `detail` is preferred (it's the specific reason, e.g. "Checking out carts
 * with snapshot dates not permitted"), then `title`; `fallback` when the
 * shape is unknown. The SDK's fetch client resolves with `{ error }` instead
 * of throwing, so call this on `res.error` before giving up on a request.
 */
export function epErrorMessage(error: unknown, fallback: string): string {
  const first = (
    error as { errors?: Array<{ detail?: string; title?: string }> } | undefined
  )?.errors?.[0];
  const msg = first?.detail?.trim() || first?.title?.trim();
  return msg || fallback;
}
