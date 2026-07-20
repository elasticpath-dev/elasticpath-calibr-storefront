import type { CartGroupField } from "@/lib/tenant-config";

type CustomInputs = Record<string, unknown>;
type ProductFieldEntry = { key: string; label?: string; value: string };

function humanize(segment: string): string {
  return segment.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Keys of product_fields that are inline-editable — used to avoid also
 * showing them as read-only fields (which would duplicate the input). */
export function editableProductFieldKeys(fields: CartGroupField[]): Set<string> {
  const keys = new Set<string>();
  for (const field of fields) {
    if (field.type === "product_field") keys.add(field.key);
  }
  return keys;
}

function productFieldsOf(ci: CustomInputs | undefined): ProductFieldEntry[] {
  return Array.isArray(ci?.product_fields)
    ? (ci!.product_fields as ProductFieldEntry[])
    : [];
}

/** Current value of an editable field on a line item's raw custom_inputs. */
export function getEditableValue(
  ci: CustomInputs | undefined,
  field: CartGroupField,
): string {
  if (field.type === "product_field") {
    return productFieldsOf(ci).find((f) => f.key === field.key)?.value ?? "";
  }
  let current: unknown = ci;
  for (const segment of field.path) {
    if (current == null || typeof current !== "object") return "";
    current = (current as CustomInputs)[segment];
  }
  return current == null || typeof current === "object" ? "" : String(current);
}

/** Display label for an editable field (product-field label, else humanized). */
export function getEditableLabel(
  ci: CustomInputs | undefined,
  field: CartGroupField,
): string {
  if (field.type === "product_field") {
    const match = productFieldsOf(ci).find((f) => f.key === field.key);
    return match?.label || humanize(field.key);
  }
  return humanize(field.path[field.path.length - 1]);
}

/**
 * Returns a new custom_inputs object with the field set to `value`, preserving
 * every other custom input (parent_product_id, options, product_fields, etc.).
 * Cloned along the mutated path so the original object isn't touched.
 */
export function setEditableValue(
  ci: CustomInputs | undefined,
  field: CartGroupField,
  value: string,
): CustomInputs {
  const base: CustomInputs = { ...(ci ?? {}) };

  if (field.type === "product_field") {
    const fields = productFieldsOf(base).map((f) => ({ ...f }));
    const idx = fields.findIndex((f) => f.key === field.key);
    if (idx >= 0) fields[idx].value = value;
    else fields.push({ key: field.key, label: humanize(field.key), value });
    base.product_fields = fields;
    return base;
  }

  let node = base;
  for (let i = 0; i < field.path.length - 1; i++) {
    const seg = field.path[i];
    const child = node[seg];
    node[seg] =
      child && typeof child === "object" ? { ...(child as CustomInputs) } : {};
    node = node[seg] as CustomInputs;
  }
  node[field.path[field.path.length - 1]] = value;
  return base;
}
