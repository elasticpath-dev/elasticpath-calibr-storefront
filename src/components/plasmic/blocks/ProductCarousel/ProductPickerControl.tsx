"use client";

import { useEffect, useRef, useState } from "react";
import type { SelectedProduct } from "./ProductCarousel";

type SearchField = "name" | "sku" | "slug";

const FIELD_LABELS: Record<SearchField, string> = {
  name: "Name",
  sku: "SKU",
  slug: "Slug",
};

type Props = {
  value?: SelectedProduct[];
  updateValue?: (newVal: SelectedProduct[]) => void;
};

export function ProductPickerControl({ value, updateValue }: Props) {
  const [selected, setSelected] = useState<SelectedProduct[]>(value ?? []);
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setSelected(value ?? []);
  }, [value]);

  const search = async (q: string, field: SearchField) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/products/search?name=${encodeURIComponent(q)}&field=${field}`);
      const json = await res.json();
      setResults(json.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, searchField), 350);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = e.target.value as SearchField;
    setSearchField(f);
    setResults([]);
    if (query.trim()) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(query, f), 350);
    }
  };

  const add = (product: SelectedProduct) => {
    if (selected.some((p) => p.id === product.id)) return;
    const next = [...selected, product];
    setSelected(next);
    updateValue?.(next);
    setQuery("");
    setResults([]);
  };

  const remove = (id: string) => {
    const next = selected.filter((p) => p.id !== id);
    setSelected(next);
    updateValue?.(next);
  };

  const showResults = results.length > 0 || (searching && query.length > 0);
  const placeholder =
    searchField === "sku" ? "Enter SKU…" : searchField === "slug" ? "Enter slug…" : "Search by name…";

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: 12 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: showResults ? 0 : 8 }}>
        <select
          value={searchField}
          onChange={handleFieldChange}
          style={{
            padding: "6px 4px",
            border: "1px solid var(--color-ink-200)",
            borderRadius: showResults ? "4px 4px 0 0" : 4,
            fontSize: 12,
            background: "var(--color-ink-50)",
            cursor: "pointer",
            outline: "none",
            flexShrink: 0,
          }}
        >
          {(Object.keys(FIELD_LABELS) as SearchField[]).map((f) => (
            <option key={f} value={f}>{FIELD_LABELS[f]}</option>
          ))}
        </select>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "6px 8px",
            border: "1px solid var(--color-ink-200)",
            borderRadius: showResults ? "4px 4px 0 0" : 4,
            fontSize: 12,
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {showResults && (
        <div
          style={{
            border: "1px solid var(--color-ink-200)",
            borderTop: "none",
            borderRadius: "0 0 4px 4px",
            marginBottom: 8,
            background: "#fff",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {searching && (
            <div style={{ padding: "6px 10px", color: "var(--color-ink-400)" }}>Searching…</div>
          )}
          {!searching &&
            results.map((product) => {
              const already = selected.some((p) => p.id === product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={already}
                  onClick={() => add(product)}
                  style={{
                    display: "flex",
                    width: "100%",
                    padding: "7px 10px",
                    background: already ? "var(--color-ink-50)" : "#fff",
                    color: already ? "var(--color-ink-400)" : "#111827",
                    border: "none",
                    borderBottom: "1px solid var(--color-ink-100)",
                    cursor: already ? "default" : "pointer",
                    textAlign: "left",
                    fontSize: 12,
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{product.name}</span>
                  {already && <span style={{ fontSize: 10, color: "var(--color-ink-600)" }}>Added ✓</span>}
                </button>
              );
            })}
        </div>
      )}

      {selected.length > 0 && (
        <div>
          {selected.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 8px",
                marginBottom: 4,
                background: "#f0f4ff",
                border: "1px solid #c7d2fe",
                borderRadius: 4,
                gap: 6,
              }}
            >
              <span style={{ color: "var(--color-ink-600)", fontSize: 10, minWidth: 14 }}>{i + 1}.</span>
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#1e40af",
                }}
              >
                {p.name}
              </span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                title="Remove"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink-400)",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: "0 2px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
