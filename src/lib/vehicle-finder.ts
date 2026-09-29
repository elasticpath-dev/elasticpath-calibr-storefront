/**
 * Vehicle finder cascade configuration.
 *
 * Each level's dropdown options come from an Elastic Path Custom API served at
 * `GET /v2/{slug}` and returning `{ data: [{ id, attributes: {…} }] }`, filtered
 * with `?filter=eq(field,value)`. The cascade is generic — the UI
 * (VehicleFinder.tsx) and the proxy route (/api/vehicle-finder) read this array,
 * so wiring it to your real data is just editing the values below.
 *
 * ▶ FILL IN for your store:
 *   - `slug`        — the Custom API slug for each level.
 *   - `labelField`  — the attribute shown in the dropdown.
 *   - `valueField`  — "id" (default) or an attribute whose value identifies the
 *                     selection and is passed to child levels as their filter.
 *   - `filters`     — how each level is narrowed by earlier selections:
 *                     `{ field, from }` → EP `eq(<field>, <selected value of `from`>)`.
 *                     Add more entries to filter by the full chain if needed
 *                     (e.g. model by both make and year).
 */

export type VehicleLevelKey =
  | "lookupType"
  | "year"
  | "make"
  | "model"
  | "engine";

export type VehicleLevel = {
  /** Stable key; also the i18n label key under the "vehicleFinder" namespace. */
  key: VehicleLevelKey;
  /** Elastic Path Custom API slug — requested at GET /v2/{slug}. */
  slug: string;
  /** Record attribute used as the option's visible label. */
  labelField: string;
  /** "id" to send the record id to child levels, or an attribute name to send
   * that field's value (e.g. the literal year "2020"). */
  valueField: string;
  /** Filters applied from earlier selections. `field` is the Custom API field;
   * `from` is the parent level whose selected value fills it. */
  filters: Array<{ field: string; from: VehicleLevelKey }>;
};

// Modeled on this source fitment record (one row per full combination):
//   { lookupCode, lookupType, year, makeId, make, modelId, model,
//     equipmentUnitId, engine }
// split into 5 Custom APIs (see the data-breakdown plan / README). Each level
// sends the selected value shown in `valueField` down to its children, which
// filter on it via the `filters` field names.
export const VEHICLE_LEVELS: VehicleLevel[] = [
  {
    key: "lookupType",
    slug: "vehicle-lookup-types",
    labelField: "lookup_type", // "Auto & Light Truck"
    valueField: "lookup_code", // "autoandlighttruck" — passed to children
    filters: [],
  },
  {
    key: "year",
    slug: "vehicle-years",
    labelField: "year", // 2022
    valueField: "year",
    filters: [{ field: "lookup_code", from: "lookupType" }],
  },
  {
    key: "make",
    slug: "vehicle-makes",
    labelField: "make", // "Volvo"
    valueField: "make_id", // 62 — passed to children
    filters: [
      { field: "lookup_code", from: "lookupType" },
      { field: "year", from: "year" },
    ],
  },
  {
    key: "model",
    slug: "vehicle-models",
    labelField: "model", // "XC90"
    valueField: "model_id", // 1154 — passed to children
    filters: [
      { field: "year", from: "year" },
      { field: "make_id", from: "make" },
    ],
  },
  {
    key: "engine",
    slug: "vehicle-engines",
    labelField: "engine", // "2.0L 4-cyl Engine Code B4204T28 4 Turbo"
    valueField: "equipment_unit_id", // 44414080 — the fitment id used by Shop now
    filters: [
      { field: "make_id", from: "make" },
      { field: "model_id", from: "model" },
    ],
  },
];

export function getVehicleLevel(key: string): VehicleLevel | undefined {
  return VEHICLE_LEVELS.find((l) => l.key === key);
}
