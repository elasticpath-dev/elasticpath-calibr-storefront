import type { CartGroupField } from "@/lib/tenant-config";

type CustomInputs = Record<string, unknown>;
type ArrayEntry = { key: string; label?: string; value: string };

function humanize(segment: string): string {
  return segment.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Walks a dot path and returns the array found there (empty if absent). */
function arrayAt(ci: CustomInputs | undefined, arrayName: string): ArrayEntry[] {
  let current: unknown = ci;
  for (const seg of arrayName.split(".")) {
    if (current == null || typeof current !== "object") return [];
    current = (current as CustomInputs)[seg];
  }
  return Array.isArray(current) ? (current as ArrayEntry[]) : [];
}

/** Entry keys of a given array that are inline-editable — used to avoid also
 * showing them as read-only fields (which would duplicate the input). */
export function editableArrayKeys(
  fields: CartGroupField[],
  arrayName: string,
): Set<string> {
  const keys = new Set<string>();
  for (const field of fields) {
    if (field.type === "array_lookup" && field.arrayName === arrayName) {
      keys.add(field.key);
    }
  }
  return keys;
}

/** Current value of a field on a line item's raw custom_inputs. */
export function getEditableValue(
  ci: CustomInputs | undefined,
  field: CartGroupField,
): string {
  if (field.type === "array_lookup") {
    return arrayAt(ci, field.arrayName).find((f) => f.key === field.key)?.value ?? "";
  }
  let current: unknown = ci;
  for (const segment of field.path) {
    if (current == null || typeof current !== "object") return "";
    current = (current as CustomInputs)[segment];
  }
  return current == null || typeof current === "object" ? "" : String(current);
}

/** Display label for a field (array entry's label, else humanized key/segment). */
export function getEditableLabel(
  ci: CustomInputs | undefined,
  field: CartGroupField,
): string {
  if (field.type === "array_lookup") {
    const match = arrayAt(ci, field.arrayName).find((f) => f.key === field.key);
    return match?.label || humanize(field.key);
  }
  return humanize(field.path[field.path.length - 1]);
}

/**
 * Returns a new custom_inputs object with the field set to `value`, preserving
 * every other custom input. Cloned along the mutated path so the original
 * object isn't touched.
 */
export function setEditableValue(
  ci: CustomInputs | undefined,
  field: CartGroupField,
  value: string,
): CustomInputs {
  const base: CustomInputs = { ...(ci ?? {}) };
  const path = field.type === "array_lookup" ? field.arrayName.split(".") : field.path;

  // Clone down to the parent of the leaf so the original stays untouched.
  let node = base;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    const child = node[seg];
    node[seg] =
      child && typeof child === "object" ? { ...(child as CustomInputs) } : {};
    node = node[seg] as CustomInputs;
  }
  const leaf = path[path.length - 1];

  if (field.type === "array_lookup") {
    const entries: ArrayEntry[] = Array.isArray(node[leaf])
      ? (node[leaf] as ArrayEntry[]).map((e) => ({ ...e }))
      : [];
    const idx = entries.findIndex((e) => e.key === field.key);
    if (idx >= 0) entries[idx].value = value;
    else entries.push({ key: field.key, label: humanize(field.key), value });
    node[leaf] = entries;
  } else {
    node[leaf] = value;
  }
  return base;
}
