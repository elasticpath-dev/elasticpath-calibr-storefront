"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string };

type Props = {
  value?: string;
  updateValue?: (newVal: string) => void;
};

export function NodePickerControl({ value, updateValue }: Props) {
  const [hierarchies, setHierarchies] = useState<Item[]>([]);
  const [hierarchyId, setHierarchyId] = useState("");
  const [nodes, setNodes] = useState<Item[]>([]);
  const [loadingHierarchies, setLoadingHierarchies] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState(false);

  useEffect(() => {
    setLoadingHierarchies(true);
    fetch("/api/hierarchies")
      .then((r) => r.json())
      .then((json) => setHierarchies(json.data ?? []))
      .catch(() => setHierarchies([]))
      .finally(() => setLoadingHierarchies(false));
  }, []);

  useEffect(() => {
    if (!hierarchyId) { setNodes([]); return; }
    setLoadingNodes(true);
    fetch(`/api/hierarchies/${hierarchyId}/nodes`)
      .then((r) => r.json())
      .then((json) => setNodes(json.data ?? []))
      .catch(() => setNodes([]))
      .finally(() => setLoadingNodes(false));
  }, [hierarchyId]);

  const handleNodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateValue?.(e.target.value);
  };

  const selectedNodeName = nodes.find((n) => n.id === value)?.name ?? null;

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--color-ink-200)",
    borderRadius: 4,
    fontSize: 12,
    background: "#fff",
    cursor: "pointer",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    color: "var(--color-ink-600)",
    marginBottom: 4,
  };

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <span style={labelStyle}>Hierarchy</span>
        <select
          value={hierarchyId}
          onChange={(e) => {
            setHierarchyId(e.target.value);
            updateValue?.("");
          }}
          disabled={loadingHierarchies}
          style={selectStyle}
        >
          <option value="">{loadingHierarchies ? "Loading…" : "Select hierarchy…"}</option>
          {hierarchies.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      {hierarchyId && (
        <div>
          <span style={labelStyle}>Node</span>
          <select
            value={value ?? ""}
            onChange={handleNodeChange}
            disabled={loadingNodes || nodes.length === 0}
            style={selectStyle}
          >
            <option value="">
              {loadingNodes ? "Loading…" : nodes.length === 0 ? "No nodes found" : "Select node…"}
            </option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>
      )}

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
          {selectedNodeName ?? value}
        </div>
      )}
    </div>
  );
}
