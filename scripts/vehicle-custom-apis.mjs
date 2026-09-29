#!/usr/bin/env node
/**
 * Create the vehicle-finder Custom APIs (and their fields) in Elastic Path, and
 * optionally load fitment data into them.
 *
 * Usage:
 *   node scripts/vehicle-custom-apis.mjs setup             # create the 5 Custom APIs + fields
 *   node scripts/vehicle-custom-apis.mjs load <file.json>  # dedup + load fitment rows
 *   node scripts/vehicle-custom-apis.mjs setup load <file.json>
 *
 * Env (read from process.env or .env.local):
 *   EPCC_ENDPOINT_URL / NEXT_PUBLIC_EPCC_ENDPOINT_URL   host, no protocol/trailing slash
 *   EPCC_CLIENT_ID    / NEXT_PUBLIC_EPCC_CLIENT_ID
 *   EPCC_CLIENT_SECRET                                   (required — admin ops use client_credentials)
 *   EPCC_STORE_ID     / NEXT_PUBLIC_STORE_ID             (sent as X-REQUEST-STORE-ID when present)
 *
 * The <file.json> for `load` is an array of rows shaped like:
 *   { lookupCode, lookupType, year, makeId, make, modelId, model, equipmentUnitId, engine }
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ── env ─────────────────────────────────────────────────────────────────────
function loadDotEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadDotEnvLocal();

const ENDPOINT = (
  process.env.EPCC_ENDPOINT_URL ||
  process.env.NEXT_PUBLIC_EPCC_ENDPOINT_URL ||
  ""
).replace(/^https?:\/\//, "").replace(/\/$/, "");
const CLIENT_ID =
  process.env.EPCC_CLIENT_ID || process.env.NEXT_PUBLIC_EPCC_CLIENT_ID || "";
const CLIENT_SECRET = process.env.EPCC_CLIENT_SECRET || "";
const STORE_ID =
  process.env.EPCC_STORE_ID || process.env.NEXT_PUBLIC_STORE_ID || "";

if (!ENDPOINT || !CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing env: EPCC_ENDPOINT_URL, EPCC_CLIENT_ID and EPCC_CLIENT_SECRET are required.",
  );
  process.exit(1);
}

const BASE = `https://${ENDPOINT}`;
const storeHeaders = STORE_ID ? { "X-REQUEST-STORE-ID": STORE_ID } : {};

// Only load this subset of the source data. Empty array = no restriction.
const LOAD_FILTER = {
  years: [2026, 2025],
  makes: ["Audi", "BMW"],
};
function matchesFilter(r) {
  if (LOAD_FILTER.years.length && !LOAD_FILTER.years.includes(r.year)) return false;
  if (LOAD_FILTER.makes.length && !LOAD_FILTER.makes.includes(r.make)) return false;
  return true;
}

// ── helpers for derived engine fields ────────────────────────────────────────
function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Deterministic hash → same engine always gets the same generated spec.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick(arr, seed) {
  return arr[hashStr(seed) % arr.length];
}

// Maintenance spec generated dynamically from the car (make/model/year/engine)
// so it's specific per vehicle and stable across re-runs.
function generateSpec(r) {
  const seed = `${r.make}|${r.model}|${r.year}|${r.engine}|${r.equipmentUnitId ?? ""}`;
  return {
    engine_oil_grade: pick(["0W-20", "5W-30", "5W-40", "10W-40"], `${seed}oilg`),
    engine_oil_capacity: pick(["4.5 L", "5.2 L", "5.7 L", "6.0 L"], `${seed}oilc`),
    oil_filter: pick(["MANN W 719/45", "Bosch P7276", "Fram PH-4967", "Wix 51348"], `${seed}oilf`),
    air_filter: pick(["MANN C 30 130", "Fram CA-10755", "Wix 49158", "Bosch S3937"], `${seed}airf`),
    cabin_air_filter: pick(["MANN CU 2939", "Fram CF-11966", "Bosch P3922"], `${seed}cabf`),
    coolant: pick(["G12++ (violet)", "G13 (pink)", "OAT (orange)", "HOAT (yellow)"], `${seed}cool`),
    coolant_capacity: pick(["6.5 L", "7.5 L", "8.0 L", "9.0 L"], `${seed}coolc`),
    spark_plugs: pick(["NGK PFR7S8EG", "Denso IK20", "Bosch FR7NPP332", "NGK ILZKR7B11"], `${seed}spark`),
    brake_fluid: pick(["DOT 4", "DOT 4 LV", "DOT 5.1"], `${seed}brake`),
    battery: pick(["AGM 70Ah", "AGM 80Ah", "EFB 72Ah", "Lead-acid 60Ah"], `${seed}batt`),
  };
}

// ── the 5 Custom APIs ────────────────────────────────────────────────────────
// `map` shapes a source row into an entry's fields; `dedupKey` identifies the
// distinct rows for that level (the source has one row per full combination).
const DEFS = [
  {
    slug: "vehicle-lookup-types",
    apiType: "vehicle_lookup_types_ext",
    name: "Vehicle Lookup Types",
    fields: [
      { slug: "lookup_code", name: "Lookup Code", type: "string" },
      { slug: "lookup_type", name: "Lookup Type", type: "string" },
    ],
    map: (r) => ({ lookup_code: r.lookupCode, lookup_type: r.lookupType }),
    dedupKey: (r) => `${r.lookupCode}`,
  },
  {
    slug: "vehicle-years",
    apiType: "vehicle_years_ext",
    name: "Vehicle Years",
    fields: [
      { slug: "lookup_code", name: "Lookup Code", type: "string" },
      { slug: "year", name: "Year", type: "integer" },
    ],
    map: (r) => ({ lookup_code: r.lookupCode, year: r.year }),
    dedupKey: (r) => `${r.lookupCode}|${r.year}`,
  },
  {
    slug: "vehicle-makes",
    apiType: "vehicle_makes_ext",
    name: "Vehicle Makes",
    fields: [
      { slug: "lookup_code", name: "Lookup Code", type: "string" },
      { slug: "year", name: "Year", type: "integer" },
      { slug: "make_id", name: "Make ID", type: "integer" },
      { slug: "make", name: "Make", type: "string" },
    ],
    map: (r) => ({
      lookup_code: r.lookupCode,
      year: r.year,
      make_id: r.makeId,
      make: r.make,
    }),
    dedupKey: (r) => `${r.lookupCode}|${r.year}|${r.makeId}`,
  },
  {
    slug: "vehicle-models",
    apiType: "vehicle_models_ext",
    name: "Vehicle Models",
    fields: [
      { slug: "year", name: "Year", type: "integer" },
      { slug: "make_id", name: "Make ID", type: "integer" },
      { slug: "model_id", name: "Model ID", type: "integer" },
      { slug: "model", name: "Model", type: "string" },
    ],
    map: (r) => ({
      year: r.year,
      make_id: r.makeId,
      model_id: r.modelId,
      model: r.model,
    }),
    dedupKey: (r) => `${r.year}|${r.makeId}|${r.modelId}`,
  },
  {
    slug: "vehicle-engines",
    apiType: "vehicle_engines_ext",
    name: "Vehicle Engines",
    fields: [
      // Engines are scoped by year too — the same engine can span multiple
      // years, so year is part of the record (and its dedup + filter).
      { slug: "year", name: "Year", type: "integer" },
      { slug: "make_id", name: "Make ID", type: "integer" },
      { slug: "model_id", name: "Model ID", type: "integer" },
      { slug: "equipment_unit_id", name: "Equipment Unit ID", type: "integer" },
      { slug: "engine", name: "Engine", type: "string" },
      { slug: "bundle_slug", name: "Bundle Slug", type: "string" },
      // "any" stores arbitrary JSON (not filterable — fine, we only read it).
      { slug: "spec", name: "Spec", type: "any" },
    ],
    map: (r) => ({
      year: r.year,
      make_id: r.makeId,
      model_id: r.modelId,
      equipment_unit_id: r.equipmentUnitId,
      engine: r.engine,
      bundle_slug: slugify(`${r.make} ${r.model} ${r.year} ${r.engine}`),
      spec: generateSpec(r),
    }),
    dedupKey: (r) => `${r.year}|${r.makeId}|${r.modelId}|${r.equipmentUnitId}`,
  },
];

// ── http ─────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Global throttle: space out every request start to stay under the API's
// 50 req/sec limit. 40/sec leaves headroom for retries and clock jitter.
const RATE_PER_SEC = 40;
const MIN_INTERVAL_MS = 1000 / RATE_PER_SEC;
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait) await sleep(wait);
}

let TOKEN = "";
async function getToken() {
  const res = await fetch(`${BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...storeHeaders },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`Token request failed: ${res.status} ${JSON.stringify(json)}`);
  }
  TOKEN = json.access_token;
}

async function api(method, path, body) {
  const maxAttempts = 6;
  for (let attempt = 1; ; attempt++) {
    await throttle();
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        ...storeHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // On 429, back off (honoring Retry-After when present) and retry.
    if (res.status === 429 && attempt < maxAttempts) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(2000, 250 * 2 ** (attempt - 1));
      await sleep(backoff);
      continue;
    }

    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { ok: res.ok, status: res.status, json };
  }
}

// ── setup ────────────────────────────────────────────────────────────────────
async function findCustomApiBySlug(slug) {
  // list is paginated; small dataset, first page is plenty for these
  const { json } = await api("GET", "/v2/settings/extensions/custom-apis?page[limit]=100");
  return (json.data ?? []).find((a) => (a.slug ?? a.attributes?.slug) === slug) ?? null;
}

async function createCustomApi(def) {
  const existing = await findCustomApiBySlug(def.slug);
  if (existing) {
    console.log(`  • Custom API "${def.slug}" already exists (${existing.id}) — reusing`);
    return existing.id;
  }
  const { ok, status, json } = await api("POST", "/v2/settings/extensions/custom-apis", {
    data: {
      type: "custom_api",
      name: def.name,
      description: `Vehicle finder — ${def.name}`,
      api_type: def.apiType,
      slug: def.slug,
      allow_upserts: true,
    },
  });
  if (!ok) throw new Error(`Create ${def.slug} failed: ${status} ${JSON.stringify(json)}`);
  console.log(`  ✓ Created Custom API "${def.slug}" (${json.data.id})`);
  return json.data.id;
}

async function createField(customApiId, field) {
  // "any" (arbitrary JSON) takes no validation block; scalar types get one.
  const validation =
    field.type === "integer"
      ? { integer: { allow_null_values: false } }
      : field.type === "float"
        ? { float: { allow_null_values: false } }
        : field.type === "string"
          ? { string: { allow_null_values: false } }
          : undefined;

  const { ok, status, json } = await api(
    "POST",
    `/v2/settings/extensions/custom-apis/${customApiId}/fields`,
    {
      data: {
        type: "custom_field",
        name: field.name,
        slug: field.slug,
        field_type: field.type, // "string" | "integer" | "float" | "boolean" | "any"
        description: "",
        ...(validation ? { validation } : {}),
      },
    },
  );
  if (!ok) {
    // 409 / already-exists → fine on re-run; log everything else.
    if (status === 409 || JSON.stringify(json).toLowerCase().includes("already")) {
      console.log(`    • Field "${field.slug}" already exists — skipping`);
      return;
    }
    throw new Error(`Create field ${field.slug} failed: ${status} ${JSON.stringify(json)}`);
  }
  console.log(`    ✓ Field "${field.slug}" (${field.type})`);
}

async function setup() {
  console.log("Setting up vehicle-finder Custom APIs…");
  for (const def of DEFS) {
    console.log(`\n${def.name} (/v2/extensions/${def.slug})`);
    const id = await createCustomApi(def);
    for (const field of def.fields) await createField(id, field);
  }
  console.log("\nSetup complete.");
}

// ── load ─────────────────────────────────────────────────────────────────────
async function pool(items, limit, worker) {
  let i = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
      done++;
      if (done % 200 === 0) console.log(`    …${done}/${items.length}`);
    }
  });
  await Promise.all(runners);
}

async function load(file) {
  const all = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8"));
  if (!Array.isArray(all)) throw new Error("Data file must be a JSON array of rows.");
  const rows = all.filter(matchesFilter);
  console.log(
    `\nLoading ${rows.length} of ${all.length} source rows` +
      ` (years: ${LOAD_FILTER.years.join(", ") || "all"}; makes: ${LOAD_FILTER.makes.join(", ") || "all"})…`,
  );

  for (const def of DEFS) {
    // Deduplicate rows for this level.
    const seen = new Map();
    for (const r of rows) {
      const k = def.dedupKey(r);
      if (!seen.has(k)) seen.set(k, def.map(r));
    }
    const entries = [...seen.values()];
    console.log(`\n${def.name}: ${entries.length} distinct entries → /v2/extensions/${def.slug}`);

    let failures = 0;
    await pool(entries, 6, async (attributes) => {
      const { ok, status, json } = await api("POST", `/v2/extensions/${def.slug}`, {
        data: { type: def.apiType, ...attributes },
      });
      if (!ok && failures++ < 5) {
        console.warn(`    ! insert failed (${status}): ${JSON.stringify(json).slice(0, 200)}`);
      }
    });
    if (failures) console.warn(`    ${failures} insert(s) failed for ${def.slug}`);
  }
  console.log("\nLoad complete.");
}

// ── clear (delete all entries, keep the Custom API definitions) ───────────────
async function listEntryIds(slug) {
  const ids = [];
  const limit = 100;
  let offset = 0;
  for (;;) {
    const { ok, json } = await api(
      "GET",
      `/v2/extensions/${slug}?page[limit]=${limit}&page[offset]=${offset}`,
    );
    if (!ok) break;
    const batch = json.data ?? [];
    for (const e of batch) if (e.id) ids.push(e.id);
    if (batch.length < limit) break;
    offset += limit;
  }
  return ids;
}

async function clear() {
  console.log("Deleting all entries from vehicle-finder Custom APIs…");
  for (const def of DEFS) {
    const ids = await listEntryIds(def.slug);
    console.log(`\n${def.name}: ${ids.length} entries → /v2/extensions/${def.slug}`);

    let failures = 0;
    await pool(ids, 6, async (id) => {
      const { ok, status, json } = await api("DELETE", `/v2/extensions/${def.slug}/${id}`);
      if (!ok && failures++ < 5) {
        console.warn(`    ! delete failed (${status}): ${JSON.stringify(json).slice(0, 200)}`);
      }
    });
    if (failures) console.warn(`    ${failures} delete(s) failed for ${def.slug}`);
  }
  console.log("\nClear complete.");
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const known = ["setup", "load", "clear"];
  if (args.length === 0 || !args.some((a) => known.includes(a))) {
    console.log(
      "Usage:\n" +
        "  node scripts/vehicle-custom-apis.mjs setup                 # create the Custom APIs + fields\n" +
        "  node scripts/vehicle-custom-apis.mjs load <file.json>      # dedup + load entries\n" +
        "  node scripts/vehicle-custom-apis.mjs clear                 # delete ALL entries (keeps the APIs)\n" +
        "  node scripts/vehicle-custom-apis.mjs setup load <file.json>",
    );
    process.exit(0);
  }
  await getToken();
  if (args.includes("setup")) await setup();
  // `clear` runs before `load` so `clear load <file>` reloads cleanly.
  if (args.includes("clear")) await clear();
  if (args.includes("load")) {
    const file = args[args.indexOf("load") + 1];
    if (!file) throw new Error("`load` needs a JSON file path.");
    await load(file);
  }
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
