/**
 * Elastic Path returns this shape when the manual payment gateway hasn't
 * been enabled in Commerce Manager:
 *   { "errors": [{ "status": 400, "title": "Gateway disabled", "detail": "manual payment gateway is disabled" }] }
 * Purchase Order and Cash on Delivery both post through gateway: "manual",
 * so both need to recognize this and point whoever's testing checkout at
 * the fix instead of a generic "payment failed" message.
 */
export function isManualGatewayDisabledError(error: unknown): boolean {
  const apiError = (error as { errors?: Array<{ title?: string; detail?: string }> })
    ?.errors?.[0];
  const title = apiError?.title?.toLowerCase();
  const detail = apiError?.detail?.toLowerCase();
  return (
    title === "gateway disabled" ||
    !!detail?.includes("manual payment gateway is disabled")
  );
}
