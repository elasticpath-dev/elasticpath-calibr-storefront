"use client";

import {
  useEffect,
  useId,
  useMemo,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import type { ProductCardData } from "@/lib/api/products";
import { cn } from "@/lib/utils";

// ── Search response shapes ────────────────────────────────────────────────────
type FacetBucket = { value: string; count: number; selected?: boolean };
type Facet = { field: string; type: string; buckets: FacetBucket[] };
type SearchDoc = { id: string; slug?: string; name?: string };
type SearchItem = { id: string; document: SearchDoc };
type SearchResponse = {
  items?: SearchItem[];
  total?: number;
  hasMore?: boolean;
  offset?: number;
  facets?: Facet[];
  error?: string;
};

type Selected = Record<string, string[]>;

export type SearchModuleProps = {
  lang?: string;
  title?: string;
  pageSize?: number;
  /** Search profile — sent in the request body as `profile_id`. */
  profileId?: string;
  /** Author-configured starting query (runs on load; blank = everything). */
  initialQuery?: string;
  /** Author-configured facets: which fields show, in what order, with optional
   * labels. Empty = show every facet the response returns. */
  facetConfig?: Array<{ field?: string; label?: string }>;
  /** Author-configured facet filters applied on load. */
  defaultFilters?: Array<{ field?: string; value?: string }>;
  /** Hide the left-hand facets section (results go full width). */
  hideFacets?: boolean;
  /** Cards per row at each breakpoint: mobile / ≥640px / ≥1280px. */
  colsMobile?: number;
  colsTablet?: number;
  colsDesktop?: number;
  /** Author content tiles inserted into the grid at specific 1-based positions
   * — same card size, with their own image and content. */
  contentCards?: Array<ContentCard>;
  /** Up to 5 slots for arbitrary Plasmic content, each placed at its 1-based
   * grid position (0 = unused) and able to span multiple card spaces. */
  slot1?: ReactNode;
  slot1Position?: number;
  slot1ColSpan?: number;
  slot1RowSpan?: number;
  slot2?: ReactNode;
  slot2Position?: number;
  slot2ColSpan?: number;
  slot2RowSpan?: number;
  slot3?: ReactNode;
  slot3Position?: number;
  slot3ColSpan?: number;
  slot3RowSpan?: number;
  slot4?: ReactNode;
  slot4Position?: number;
  slot4ColSpan?: number;
  slot4RowSpan?: number;
  slot5?: ReactNode;
  slot5Position?: number;
  slot5ColSpan?: number;
  slot5RowSpan?: number;
  className?: string;
};

type ContentCard = {
  position?: number;
  imageUrl?: string;
  title?: string;
  text?: string;
  href?: string;
  /** Card spaces this tile occupies. */
  colSpan?: number;
  rowSpan?: number;
};

const VISITOR_COOKIE = "search-visitor-id";

// Reuse the visitor id cookie if present, otherwise mint a new UUID and drop
// the cookie. Sent as a header on every search call so the backend can track
// the visitor across requests.
function getOrCreateVisitorId(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`),
  );
  if (match) return decodeURIComponent(match[1]);
  const id =
    (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; SameSite=Lax`;
  return id;
}

// "extensions.attributes.material_type" → "Material Type"
function facetLabel(field: string): string {
  const leaf = field.split(".").pop() ?? field;
  return leaf.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Groups author-configured default filters into the { field: values[] } shape.
function seedSelected(
  defaultFilters?: Array<{ field?: string; value?: string }>,
): Selected {
  const seed: Selected = {};
  for (const f of defaultFilters ?? []) {
    if (!f?.field || f.value == null || f.value === "") continue;
    (seed[f.field] ??= []).push(String(f.value));
  }
  return seed;
}

// Grid-cell span (in card spaces) for a tile — clamped to sane bounds.
function spanStyle(colSpan?: number, rowSpan?: number): CSSProperties {
  const style: CSSProperties = {};
  const c = Math.min(6, Math.max(1, Math.round(colSpan ?? 1) || 1));
  const r = Math.min(4, Math.max(1, Math.round(rowSpan ?? 1) || 1));
  if (c > 1) style.gridColumn = `span ${c}`;
  if (r > 1) style.gridRow = `span ${r}`;
  return style;
}

// Builds the filter tree: AND across fields, OR within a field's values.
function buildFilters(selected: Selected) {
  const clauses = Object.entries(selected)
    .filter(([, values]) => values.length > 0)
    .map(([field, values]) =>
      values.length === 1
        ? { field, op: "eq", value: values[0] }
        : { or: values.map((value) => ({ field, op: "eq", value })) },
    );
  return clauses.length ? { and: clauses } : undefined;
}

// ── Shared store ──────────────────────────────────────────────────────────────
// Plasmic mounts one copy of this component PER responsive breakpoint (toggled
// via CSS), so mobile and desktop are separate React instances. A per-instance
// useState would let each drift out of sync — the visible one updates on
// interaction, the hidden one stays stale. So the query state lives in a
// module-level store keyed by config: every instance subscribes to and mutates
// the same store, and the search runs once per config (not once per instance).

type StoreState = {
  selected: Selected;
  items: SearchItem[];
  cardsById: Record<string, ProductCardData>;
  facets: Facet[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
};

type StoreConfig = {
  query: string;
  pageSize: number;
  profileId: string;
  defaultFilters?: Array<{ field?: string; value?: string }>;
};

const EMPTY_STATE: StoreState = {
  selected: {},
  items: [],
  cardsById: {},
  facets: [],
  total: 0,
  hasMore: false,
  loading: true,
  loadingMore: false,
  error: null,
};

function createStore(config: StoreConfig) {
  let state: StoreState = { ...EMPTY_STATE, selected: seedSelected(config.defaultFilters) };
  const listeners = new Set<() => void>();
  let visitorId = "";
  let started = false;

  const emit = () => listeners.forEach((l) => l());
  const set = (patch: Partial<StoreState>) => {
    state = { ...state, ...patch };
    emit();
  };

  async function run(offset: number, append: boolean) {
    set(append ? { loadingMore: true, error: null } : { loading: true, error: null });
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(visitorId ? { [VISITOR_COOKIE]: visitorId } : {}),
        },
        body: JSON.stringify({
          query: config.query,
          filters: buildFilters(state.selected),
          ...(config.profileId ? { profile_id: config.profileId } : {}),
          limit: config.pageSize,
          offset,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as SearchResponse;
      if (!res.ok) {
        set({ error: json.error ?? "Search failed", loading: false, loadingMore: false });
        return;
      }
      const newItems = json.items ?? [];
      const items = append ? [...state.items, ...newItems] : newItems;

      // Fetch full product data from Elastic Path so results render as the real
      // storefront ProductCard (price, variations, quick view, add to cart).
      const ids = newItems
        .map((it) => it.document?.id)
        .filter((id): id is string => !!id);
      let cards: ProductCardData[] = [];
      if (ids.length) {
        const cr = await fetch(
          `/api/catalog/products?ids=${encodeURIComponent(ids.join(","))}`,
        );
        const cj = (await cr.json().catch(() => ({}))) as { data?: ProductCardData[] };
        cards = cj.data ?? [];
      }
      const cardsById = append ? { ...state.cardsById } : {};
      for (const c of cards) if (c.id) cardsById[c.id] = c;

      set({
        items,
        cardsById,
        total: json.total ?? items.length,
        hasMore: Boolean(json.hasMore),
        facets: append ? state.facets : json.facets ?? [],
        loading: false,
        loadingMore: false,
      });
    } catch {
      set({ error: "Search failed", loading: false, loadingMore: false });
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    // Kick off the initial search once, when the visitor id is known.
    start(vid: string) {
      if (vid) visitorId = vid;
      if (started || !visitorId) return;
      started = true;
      void run(0, false);
    },
    toggleFacet(field: string, value: string) {
      const cur = state.selected[field] ?? [];
      const next = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      const selected = { ...state.selected, [field]: next };
      if (next.length === 0) delete selected[field];
      set({ selected });
      void run(0, false);
    },
    clearAll() {
      set({ selected: {} });
      void run(0, false);
    },
    loadMore() {
      void run(state.items.length, true);
    },
  };
}

type Store = ReturnType<typeof createStore>;
const storeRegistry = new Map<string, Store>();

function getStore(key: string, config: StoreConfig): Store {
  let store = storeRegistry.get(key);
  if (!store) {
    store = createStore(config);
    storeRegistry.set(key, store);
  }
  return store;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SearchModule({
  lang = "en",
  title = "",
  pageSize = 24,
  profileId = "",
  initialQuery = "",
  facetConfig,
  defaultFilters,
  hideFacets = false,
  colsMobile = 2,
  colsTablet = 3,
  colsDesktop = 4,
  contentCards,
  className,
  ...slotProps
}: SearchModuleProps) {
  // Collect the 5 slot definitions into one array.
  const slotTiles = ([1, 2, 3, 4, 5] as const)
    .map((n) => {
      const p = slotProps as Record<string, unknown>;
      return {
        node: p[`slot${n}`] as ReactNode,
        position: (p[`slot${n}Position`] as number) ?? 0,
        colSpan: (p[`slot${n}ColSpan`] as number) ?? 1,
        rowSpan: (p[`slot${n}RowSpan`] as number) ?? 1,
      };
    })
    .filter((s) => s.node && s.position > 0);
  // Responsive column counts → a scoped grid class (Tailwind can't take dynamic
  // counts, and inline styles can't hold media queries).
  const clamp = (n: number) => Math.min(8, Math.max(1, Math.round(n) || 1));
  const rawGridId = useId();
  const gridClass = `sm-grid-${rawGridId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const gridCss =
    `.${gridClass}{display:grid;gap:1rem;grid-template-columns:repeat(${clamp(colsMobile)},minmax(0,1fr));}` +
    `@media(min-width:640px){.${gridClass}{grid-template-columns:repeat(${clamp(colsTablet)},minmax(0,1fr));}}` +
    `@media(min-width:1280px){.${gridClass}{grid-template-columns:repeat(${clamp(colsDesktop)},minmax(0,1fr));}}`;
  // Config identity — the store (and its results) is shared across every
  // instance with the same config, and rebuilt when the config changes.
  const defaultFiltersKey = JSON.stringify(
    (defaultFilters ?? []).map((f) => [f?.field ?? "", f?.value ?? ""]),
  );
  const storeKey = `${initialQuery}||${defaultFiltersKey}||${profileId}||${pageSize}`;

  const store = useMemo(
    () =>
      getStore(storeKey, {
        query: initialQuery,
        pageSize,
        profileId,
        defaultFilters,
      }),
    // defaultFilters captured via storeKey; other primitives are in the key too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeKey],
  );

  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  // Establish the visitor id (cookie), then start the initial search.
  useEffect(() => {
    store.start(getOrCreateVisitorId());
  }, [store]);

  const { selected, items, cardsById, facets, total, hasMore, loading, loadingMore, error } =
    state;

  const selectedChips = useMemo(
    () =>
      Object.entries(selected).flatMap(([field, values]) =>
        values.map((value) => ({ field, value })),
      ),
    [selected],
  );

  // Which facets to render + their labels. With facetConfig set, show exactly
  // those fields (in order, with label overrides); otherwise every returned facet.
  const displayFacets = useMemo(() => {
    const configured = (facetConfig ?? []).filter((c) => c?.field);
    if (configured.length === 0) {
      return facets.map((facet) => ({ facet, label: facetLabel(facet.field) }));
    }
    return configured
      .map((cfg) => {
        const facet = facets.find((f) => f.field === cfg.field);
        return facet
          ? { facet, label: cfg.label?.trim() || facetLabel(cfg.field!) }
          : null;
      })
      .filter((x): x is { facet: Facet; label: string } => x !== null);
  }, [facets, facetConfig]);

  // Product cards (in relevance order) with author content tiles woven in at
  // their configured 1-based positions.
  const cells = useMemo<ReactNode[]>(() => {
    const nodes: ReactNode[] = [];
    for (const item of items) {
      const card = cardsById[item.document?.id ?? ""];
      if (card) nodes.push(<ProductCard key={item.id} product={card} lang={lang} />);
    }

    // Tiles = structured content cards + composable slots, each targeting a
    // 1-based grid position and able to span multiple card spaces.
    type Tile = { position: number; node: ReactNode; order: number };
    const tiles: Tile[] = [];
    (contentCards ?? []).forEach((c, i) => {
      if (c && (c.imageUrl || c.title || c.text)) {
        tiles.push({
          position: c.position ?? nodes.length + 1,
          node: (
            <div
              key={`cc-${i}`}
              className="h-full"
              style={spanStyle(c.colSpan, c.rowSpan)}
            >
              <ContentCardTile card={c} />
            </div>
          ),
          order: i,
        });
      }
    });
    slotTiles.forEach((s, i) => {
      tiles.push({
        position: s.position,
        node: (
          <div
            key={`slot-${i}`}
            className="h-full"
            style={spanStyle(s.colSpan, s.rowSpan)}
          >
            {s.node}
          </div>
        ),
        order: 100 + i,
      });
    });

    // Ascending so absolute positions stay correct as earlier inserts shift.
    tiles.sort((a, b) => a.position - b.position || a.order - b.order);
    for (const t of tiles) {
      const idx = Math.min(Math.max(0, t.position - 1), nodes.length);
      nodes.splice(idx, 0, t.node);
    }
    return nodes;
  }, [items, cardsById, contentCards, lang, slotTiles]);

  return (
    <div className={cn("w-full", className)}>
      <style dangerouslySetInnerHTML={{ __html: gridCss }} />
      {title && (
        <h2 className="mb-6 text-2xl font-bold text-ink-900">{title}</h2>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Facets */}
        {!hideFacets && (
        <aside className="w-full shrink-0 lg:w-64">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700">
              Filters
            </h3>
            {selectedChips.length > 0 && (
              <button
                type="button"
                onClick={() => store.clearAll()}
                className="text-xs text-brand-secondary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {displayFacets.length === 0 && !loading ? (
            <p className="text-sm text-ink-500">No filters available.</p>
          ) : (
            <div className="space-y-6">
              {displayFacets.map(({ facet, label }) => (
                <div key={facet.field}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {label}
                  </p>
                  <ul className="space-y-1.5">
                    {facet.buckets.map((bucket) => {
                      const checked =
                        selected[facet.field]?.includes(bucket.value) ?? false;
                      return (
                        <li key={bucket.value}>
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                store.toggleFacet(facet.field, bucket.value)
                              }
                              className="h-4 w-4 rounded border-ink-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <span className="flex-1 truncate">{bucket.value}</span>
                            <span className="text-xs text-ink-400">
                              {bucket.count}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </aside>
        )}

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-600">
              {loading ? "Searching…" : `${total} result${total === 1 ? "" : "s"}`}
            </span>
            {/* Removable chips are only shown when facets are visible — with
                facets hidden the (pre-configured) filters aren't user-clearable. */}
            {!hideFacets &&
              selectedChips.map(({ field, value }) => (
                <button
                  key={`${field}:${value}`}
                  type="button"
                  onClick={() => store.toggleFacet(field, value)}
                  className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-700 hover:bg-ink-200"
                >
                  {value}
                  <X size={12} />
                </button>
              ))}
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          {loading ? (
            <div className={gridClass}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-xl bg-ink-100"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 py-20 text-center text-sm text-ink-500">
              No products found.
            </div>
          ) : (
            <>
              <div className={gridClass}>{cells}</div>

              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    isLoading={loadingMore}
                    onClick={() => store.loadMore()}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// An author-supplied promotional tile — same grid-cell size as a ProductCard,
// with its own image and content. Optionally wraps the whole tile in a link.
function ContentCardTile({ card }: { card: ContentCard }) {
  const inner = (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-200 bg-white">
      {card.imageUrl && (
        <div className="relative aspect-square bg-ink-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt={card.title ?? ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      {(card.title || card.text) && (
        <div className="flex flex-1 flex-col gap-1 p-3">
          {card.title && (
            <h3 className="text-sm font-semibold leading-snug text-ink-900">
              {card.title}
            </h3>
          )}
          {card.text && (
            <p className="text-xs text-ink-600">{card.text}</p>
          )}
        </div>
      )}
    </div>
  );

  return card.href ? (
    <a href={card.href} className="block h-full">
      {inner}
    </a>
  ) : (
    inner
  );
}
