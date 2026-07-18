"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string };

type Props = {
  value?: string;
  updateValue?: (newVal: string) => void;
};

/** Studio prop control: pick a catalog hierarchy — stores its id string. */
export function HierarchyPickerControl({ value, updateValue }: Props) {
  const [hierarchies, setHierarchies] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/hierarchies")
      .then((r) => r.json())
      .then((json) => setHierarchies(json.data ?? []))
      .catch(() => setHierarchies([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedName = hierarchies.find((h) => h.id === value)?.name ?? null;

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <select
        value={value ?? ""}
        onChange={(e) => updateValue?.(e.target.value)}
        disabled={loading}
        style={{
          width: "100%",
          padding: "6px 8px",
          border: "1px solid var(--color-ink-200)",
          borderRadius: 4,
          fontSize: 12,
          background: "#fff",
          cursor: "pointer",
          outline: "none",
          boxSizing: "border-box",
        }}
      >
        <option value="">{loading ? "Loading…" : "Select hierarchy…"}</option>
        {hierarchies.map((h) => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
      </select>

      {value && (
        <div
          style={{
            padding: "4px 8px",
            background: "#f0f4ff",
            border: "1px solid #c7d2fe",
            borderRadius: 4,
            fontSize: 11,
            color: "#1e40af",
          }}
        >
          <span style={{ color: "var(--color-ink-600)" }}>Selected: </span>
          {selectedName ?? value}
        </div>
      )}
    </div>
  );
}
